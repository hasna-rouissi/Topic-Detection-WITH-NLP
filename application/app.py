from flask import Flask, render_template, request, jsonify
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import pandas as pd
import numpy as np
import re
import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
import json
from datetime import datetime
import os

# Initialisation Flask
app = Flask(__name__)

# Télécharger les ressources NLTK si nécessaires
try:
    nltk.data.find('corpora/stopwords')
    nltk.data.find('corpora/wordnet')
except LookupError:
    nltk.download('stopwords')
    nltk.download('wordnet')

# Charger le modèle Sentence Transformer et les embeddings
MODEL_NAME = "all-MiniLM-L6-v2"
EMBEDDINGS_PATH = r"C:\Users\hasna\Desktop\Master\S3\NLP\Projet-NLP\data\embeddings_small_minilm.npy"
DATA_PATH = r"C:\Users\hasna\Desktop\Master\S3\NLP\Projet-NLP\data\data_small_with_embeddings.csv"

try:
    print(" Chargement du modèle Sentence Transformer...")
    model = SentenceTransformer(MODEL_NAME)
    
    print(" Chargement des embeddings et données...")
    # Charger les embeddings pré-calculés
    base_embeddings = np.load(EMBEDDINGS_PATH)
    
    # Charger les données pour avoir les textes originaux
    df = pd.read_csv(DATA_PATH)
    
    # Utiliser un échantillon représentatif comme base de référence
    if len(base_embeddings) > 30000:
        # Échantillonnage stratifié pour garder la diversité
        sample_indices = np.random.choice(len(base_embeddings), size=30000, replace=False)
        base_vectors = base_embeddings[sample_indices]
    else:
        base_vectors = base_embeddings
    
    print(f" Modèle et données chargés avec succès!")
    print(f" Base de référence: {base_vectors.shape} vecteurs")
    
except Exception as e:
    print(f" Erreur lors du chargement: {e}")
    model = None
    base_vectors = None

# Prétraitement amélioré
lemmatizer = WordNetLemmatizer()
stop_words = set(stopwords.words('english'))

def preprocess_text(text):
    """
    Prétraitement avancé du texte pour l'analyse
    """
    if not isinstance(text, str):
        return ""
    
    # Conversion minuscule
    text = text.lower()
    
    # Suppression des caractères spéciaux et chiffres
    text = re.sub(r"[^a-z\s]", " ", text)
    
    # Normalisation des espaces
    text = re.sub(r"\s+", " ", text).strip()
    
    # Tokenization et filtrage
    tokens = text.split()
    
    # Lemmatisation et filtrage des stopwords/mots courts
    processed_tokens = [
        lemmatizer.lemmatize(token) 
        for token in tokens 
        if token not in stop_words and len(token) > 2
    ]
    
    return " ".join(processed_tokens)

# Historique avec sauvegarde
HISTORY_FILE = "analysis_history.json"

def load_history():
    """Charger l'historique des analyses"""
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"❌ Erreur lors du chargement de l'historique: {e}")
            return []
    return []

def save_history(history):
    """Sauvegarder l'historique des analyses"""
    try:
        with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
            json.dump(history[:50], f, ensure_ascii=False, indent=2)  # Garder seulement les 50 dernières entrées
    except Exception as e:
        print(f"❌ Erreur lors de la sauvegarde de l'historique: {e}")

# Charger l'historique au démarrage
history = load_history()

@app.route("/", methods=["GET"])
def index():
    """Page principale de l'application"""
    return render_template("index.html")

@app.route("/analyze", methods=["POST"])
def analyze():
    """
    Analyser un texte pour détecter sa nouveauté
    """
    if model is None or base_vectors is None:
        return jsonify({
            "success": False,
            "error": "Système non initialisé. Veuillez réessayer ultérieurement."
        }), 500
    
    # Récupérer les données JSON
    data = request.get_json()
    if not data:
        return jsonify({
            "success": False,
            "error": "Données manquantes dans la requête."
        }), 400
    
    text = data.get("article", "").strip()
    
    # Validation du texte
    if not text:
        return jsonify({
            "success": False,
            "error": "Veuillez entrer un texte à analyser."
        }), 400
    
    # Vérification de la longueur
    word_count = len(text.split())
    if word_count < 4:
        return jsonify({
            "success": False,
            "error": f"Le texte est trop court ({word_count} mots). Minimum 4 mots requis."
        }), 400
    
    if word_count > 1000:
        return jsonify({
            "success": False, 
            "error": f"Le texte est trop long ({word_count} mots). Maximum 1000 mots autorisé."
        }), 400
    
    try:
        # Prétraitement du texte
        clean_text = preprocess_text(text)
        
        # Vérification après prétraitement
        clean_word_count = len(clean_text.split())
        if clean_word_count < 2:
            return jsonify({
                "success": False,
                "error": "Le texte est trop court après prétraitement. Veuillez fournir un texte plus substantiel."
            }), 400
        
        # Génération de l'embedding avec Sentence Transformer
        text_embedding = model.encode([clean_text])
        
        # Calcul des similarités cosinus
        similarities = cosine_similarity(text_embedding, base_vectors)
        max_similarity = similarities.max()
        
        # Seuil de détection de nouveauté (ajustable)
        novelty_threshold = 0.60  # Peut être optimisé via vos évaluations
        
        # Détection de nouveauté
        is_novel = max_similarity < novelty_threshold
        confidence_score = 1 - max_similarity  # Score de confiance en pourcentage
        
        # Préparer le résultat détaillé
        if is_novel:
            result = {
                "type": "new",
                "message": "🆕 Nouveauté Détectée !",
                "description": "Ce texte présente un contenu innovant par rapport à notre base de connaissances.",
                "similarity_score": float(max_similarity),
                "confidence": float(confidence_score),
                "novelty_level": "Élevé" if confidence_score > 0.7 else "Modéré"
            }
        else:
            result = {
                "type": "similar", 
                "message": "📚 Contenu Similaire Trouvé",
                "description": "Ce texte présente des similitudes avec des contenus existants.",
                "similarity_score": float(max_similarity),
                "confidence": float(confidence_score),
                "novelty_level": "Faible"
            }
        
        # Ajouter à l'historique
        history_entry = {
            "text": text[:150] + "..." if len(text) > 150 else text,
            "status": "Nouveau" if is_novel else "Similaire",
            "similarity_score": float(max_similarity),
            "confidence": float(confidence_score),
            "word_count": word_count,
            "clean_word_count": clean_word_count,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "type": "new" if is_novel else "similar"
        }
        
        history.insert(0, history_entry)
        save_history(history)
        
        # Réponse de succès
        return jsonify({
            "success": True,
            "result": result,
            "analysis_details": {
                "original_words": word_count,
                "processed_words": clean_word_count,
                "embedding_dim": text_embedding.shape[1],
                "comparison_base_size": base_vectors.shape[0]
            }
        })
        
    except Exception as e:
        print(f"❌ Erreur lors de l'analyse: {str(e)}")
        return jsonify({
            "success": False,
            "error": f"Erreur lors de l'analyse: {str(e)}"
        }), 500

@app.route("/history", methods=["GET"])
def get_history():
    """Récupérer l'historique des analyses"""
    return jsonify({
        "success": True,
        "history": history[:10],  # 10 dernières analyses
        "total_analyses": len(history)
    })

@app.route("/stats", methods=["GET"])
def get_stats():
    """Récupérer les statistiques d'utilisation"""
    if not history:
        return jsonify({
            "success": True,
            "stats": {
                "total": 0,
                "new": 0,
                "similar": 0,
                "avg_similarity": 0,
                "avg_confidence": 0
            }
        })
    
    total = len(history)
    new_count = sum(1 for h in history if h.get("type") == "new")
    similar_count = total - new_count
    
    # Calcul des moyennes
    avg_similarity = np.mean([h.get("similarity_score", 0) for h in history])
    avg_confidence = np.mean([h.get("confidence", 0) for h in history])
    
    return jsonify({
        "success": True,
        "stats": {
            "total": total,
            "new": new_count,
            "similar": similar_count,
            "novelty_rate": new_count / total if total > 0 else 0,
            "avg_similarity": float(avg_similarity),
            "avg_confidence": float(avg_confidence)
        }
    })

@app.route("/system_info", methods=["GET"])
def system_info():
    """Informations sur le système"""
    system_status = {
        "model_loaded": model is not None,
        "base_vectors_loaded": base_vectors is not None,
        "model_name": MODEL_NAME if model else "Non chargé",
        "embedding_dimension": base_vectors.shape[1] if base_vectors is not None else 0,
        "reference_base_size": base_vectors.shape[0] if base_vectors is not None else 0,
        "total_analyses": len(history),
        "system_uptime": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    
    return jsonify({
        "success": True,
        "system_info": system_status
    })

@app.route("/health", methods=["GET"])
def health_check():
    """Endpoint de santé de l'application"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "model_status": "loaded" if model is not None else "error",
        "database_status": "loaded" if base_vectors is not None else "error"
    })

if __name__ == "__main__":
    print(" Démarrage de l'application Flask...")
    print(" URL: http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)