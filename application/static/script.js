// Éléments DOM
const articleInput = document.getElementById('articleInput');
const analyzeBtn = document.getElementById('analyzeBtn');
const resultContainer = document.getElementById('resultContainer');
const resultCard = document.getElementById('resultCard');
const analysisDetailsContainer = document.getElementById('analysisDetails'); // CORRIGÉ
const loadingContainer = document.getElementById('loadingContainer');
const historyList = document.getElementById('historyList');
const refreshHistoryBtn = document.getElementById('refreshHistory');
const charCount = document.getElementById('charCount');
const wordCount = document.getElementById('wordCount');
const confidenceBar = document.getElementById('confidenceBar');
const confidenceValue = document.getElementById('confidenceValue');
const totalAnalyses = document.getElementById('totalAnalyses');
const newArticles = document.getElementById('newArticles');
const similarityRate = document.getElementById('similarityRate');
const baseSize = document.getElementById('baseSize');
const systemStatus = document.getElementById('systemStatus');

// État de l'application
let appState = {
    isAnalyzing: false,
    lastAnalysis: null
};

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initialisation de NeuroScan AI...');
    
    // Vérifier que tous les éléments existent
    const elements = {
        articleInput, analyzeBtn, resultContainer, resultCard, 
        analysisDetailsContainer, loadingContainer, historyList
    };
    
    for (const [name, element] of Object.entries(elements)) {
        if (!element) {
            console.warn(`⚠️ Élément manquant: ${name}`);
        }
    }
    
    // Événements
    articleInput.addEventListener('input', updateTextStats);
    analyzeBtn.addEventListener('click', analyzeArticle);
    
    if (refreshHistoryBtn) {
        refreshHistoryBtn.addEventListener('click', loadHistory);
    }
    
    // Raccourci clavier
    articleInput.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'Enter') {
            analyzeArticle();
        }
    });
    
    // Initialisation des compteurs
    updateTextStats();
    loadHistory();
    loadStats();
    loadSystemInfo();
    
    console.log('✅ Application initialisée avec succès');
});

// Mettre à jour les statistiques du texte
function updateTextStats() {
    if (!articleInput || !charCount || !wordCount) return;
    
    const text = articleInput.value;
    const charCountValue = text.length;
    const wordCountValue = text.trim() ? text.split(/\s+/).length : 0;
    
    // Mettre à jour les compteurs
    charCount.textContent = `${charCountValue} caractères`;
    wordCount.textContent = `${wordCountValue} mots`;
    
    // Changer la couleur selon la longueur
    if (wordCountValue < 4) {
        wordCount.style.color = '#ef476f';
        charCount.style.color = '#ef476f';
    } else if (wordCountValue < 50) {
        wordCount.style.color = '#ffd166';
        charCount.style.color = '#ffd166';
    } else {
        wordCount.style.color = '#06d6a0';
        charCount.style.color = '#06d6a0';
    }
    
    // Activer/désactiver le bouton
    if (analyzeBtn) {
        analyzeBtn.disabled = wordCountValue < 4 || wordCountValue > 1000;
        
        if (analyzeBtn.disabled) {
            analyzeBtn.style.opacity = '0.6';
            analyzeBtn.style.cursor = 'not-allowed';
        } else {
            analyzeBtn.style.opacity = '1';
            analyzeBtn.style.cursor = 'pointer';
        }
    }
}

// Analyser l'article
async function analyzeArticle() {
    console.log('🔍 Début de l\'analyse...');
    
    if (appState.isAnalyzing) {
        console.log('⚠️ Analyse déjà en cours');
        showError('Une analyse est déjà en cours...');
        return;
    }
    
    const text = articleInput.value.trim();
    
    // Validation
    if (!text) {
        showError('Veuillez entrer un texte à analyser');
        return;
    }
    
    const wordCount = text.split(/\s+/).length;
    if (wordCount < 4) {
        showError('Le texte est trop court (minimum 4 mots requis)');
        return;
    }
    
    if (wordCount > 1000) {
        showError('Le texte est trop long (maximum 1000 mots autorisé)');
        return;
    }
    
    // Début de l'analyse
    appState.isAnalyzing = true;
    showLoading();
    
    try {
        console.log('📤 Envoi de la requête au serveur...');
        
        const response = await fetch('/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ article: text })
        });
        
        console.log('📥 Réponse reçue:', response.status);
        
        const data = await response.json();
        console.log('📊 Données reçues:', data);
        
        if (!response.ok) {
            throw new Error(data.error || `Erreur HTTP: ${response.status}`);
        }
        
        if (data.success) {
            displayResult(data.result, data.analysis_details);
            appState.lastAnalysis = data.result;
            
            // Recharger l'historique et les stats
            loadHistory();
            loadStats();
        } else {
            throw new Error(data.error || 'Erreur inconnue du serveur');
        }
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'analyse:', error);
        showError(`Erreur: ${error.message}`);
    } finally {
        hideLoading();
        appState.isAnalyzing = false;
    }
}

// Afficher le résultat - FONCTION CORRIGÉE
function displayResult(result, analysisDetails) {
    if (!resultContainer || !resultCard) {
        console.error('❌ Éléments de résultat manquants');
        return;
    }
    
    // Mettre à jour la barre de confiance
    const confidencePercent = Math.round(result.confidence * 100);
    if (confidenceBar) {
        confidenceBar.style.width = `${confidencePercent}%`;
    }
    if (confidenceValue) {
        confidenceValue.textContent = `${confidencePercent}%`;
    }
    
    // Créer le contenu du résultat
    let html = '';
    if (result.type === 'new') {
        html = `
            <div class="result-title">${result.message}</div>
            <div class="result-description">${result.description}</div>
            <div class="result-metrics">
                <div class="metric">
                    <span class="metric-label">Niveau de nouveauté</span>
                    <span class="metric-value" style="color: #06d6a0;">${result.novelty_level}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Similarité max</span>
                    <span class="metric-value">${(result.similarity_score * 100).toFixed(1)}%</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Confiance</span>
                    <span class="metric-value">${confidencePercent}%</span>
                </div>
            </div>
        `;
        resultCard.className = 'result-card new';
    } else {
        html = `
            <div class="result-title">${result.message}</div>
            <div class="result-description">${result.description}</div>
            <div class="result-metrics">
                <div class="metric">
                    <span class="metric-label">Niveau de nouveauté</span>
                    <span class="metric-value" style="color: #ef476f;">${result.novelty_level}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Similarité max</span>
                    <span class="metric-value">${(result.similarity_score * 100).toFixed(1)}%</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Confiance</span>
                    <span class="metric-value">${confidencePercent}%</span>
                </div>
            </div>
        `;
        resultCard.className = 'result-card similar';
    }
    
    resultCard.innerHTML = html;
    
    // CORRECTION : Utiliser analysisDetailsContainer correctement
    if (analysisDetails && analysisDetailsContainer) {
        const detailsHtml = `
            <div class="details-title">Détails Techniques</div>
            <div class="details-grid">
                <div class="detail-item">
                    <span class="detail-label">Mots originaux:</span>
                    <span class="detail-value">${analysisDetails.original_words}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Mots traités:</span>
                    <span class="detail-value">${analysisDetails.processed_words}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Dimension embeddings:</span>
                    <span class="detail-value">${analysisDetails.embedding_dim}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Base de référence:</span>
                    <span class="detail-value">${analysisDetails.comparison_base_size} articles</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Méthode:</span>
                    <span class="detail-value">${analysisDetails.method || 'similarité cosinus'}</span>
                </div>
            </div>
        `;
        analysisDetailsContainer.innerHTML = detailsHtml;
        analysisDetailsContainer.style.display = 'block';
    } else if (analysisDetailsContainer) {
        analysisDetailsContainer.style.display = 'none';
    }
    
    // Afficher le conteneur de résultats
    resultContainer.style.display = 'block';
    
    // Animation de défilement
    resultContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Afficher le loading
function showLoading() {
    if (loadingContainer) {
        loadingContainer.style.display = 'block';
    }
    if (resultContainer) {
        resultContainer.style.display = 'none';
    }
    if (analyzeBtn) {
        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyse en cours...';
    }
}

// Cacher le loading
function hideLoading() {
    if (loadingContainer) {
        loadingContainer.style.display = 'none';
    }
    if (analyzeBtn) {
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = '<i class="fas fa-play"></i> Lancer l\'Analyse IA';
    }
}

// Afficher une erreur
function showError(message) {
    if (!resultContainer || !resultCard) return;
    
    resultCard.className = 'result-card similar';
    resultCard.innerHTML = `
        <div class="result-title" style="color: #ef476f;">❌ Erreur</div>
        <div class="result-description">${message}</div>
    `;
    
    resultContainer.style.display = 'block';
    
    // Cacher les détails techniques en cas d'erreur
    if (analysisDetailsContainer) {
        analysisDetailsContainer.style.display = 'none';
    }
    
    hideLoading();
}

// Charger l'historique
async function loadHistory() {
    try {
        const response = await fetch('/history');
        const data = await response.json();
        
        if (data.success && historyList) {
            displayHistory(data.history);
        }
    } catch (error) {
        console.error('❌ Erreur lors du chargement de l\'historique:', error);
    }
}

// Afficher l'historique
function displayHistory(history) {
    if (!historyList) return;
    
    if (!history || history.length === 0) {
        historyList.innerHTML = `
            <div class="history-item" style="justify-content: center; color: var(--gray);">
                <i class="fas fa-history"></i> Aucune analyse effectuée
            </div>
        `;
        return;
    }
    
    historyList.innerHTML = history.map(item => `
        <div class="history-item ${item.type}">
            <div class="history-text">${item.text}</div>
            <div class="history-meta">
                <span class="history-tag ${item.type}">${item.status}</span>
                <span class="history-time">${formatTime(item.timestamp)}</span>
            </div>
        </div>
    `).join('');
}

// Charger les statistiques
async function loadStats() {
    try {
        const response = await fetch('/stats');
        const data = await response.json();
        
        if (data.success && data.stats) {
            updateStatsDisplay(data.stats);
        }
    } catch (error) {
        console.error('❌ Erreur lors du chargement des stats:', error);
    }
}

// Mettre à jour l'affichage des statistiques
function updateStatsDisplay(stats) {
    if (totalAnalyses) {
        totalAnalyses.textContent = stats.total;
    }
    if (newArticles) {
        newArticles.textContent = stats.new;
    }
    if (similarityRate) {
        similarityRate.textContent = `${(stats.avg_similarity * 100).toFixed(1)}%`;
    }
}

// Charger les informations système
async function loadSystemInfo() {
    try {
        const response = await fetch('/system_info');
        const data = await response.json();
        
        if (data.success && data.system_info) {
            updateSystemDisplay(data.system_info);
        }
    } catch (error) {
        console.error('❌ Erreur lors du chargement des infos système:', error);
    }
}

// Mettre à jour l'affichage système
function updateSystemDisplay(systemInfo) {
    if (baseSize) {
        baseSize.textContent = `${systemInfo.reference_base_size.toLocaleString()} articles`;
    }
    if (systemStatus) {
        systemStatus.textContent = systemInfo.base_loaded ? 
            `Système opérationnel (${systemInfo.method})` : 
            'Système en cours de chargement';
    }
}

// Formater l'heure
function formatTime(timestamp) {
    if (!timestamp) return 'Inconnu';
    
    try {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) { // Moins d'une minute
            return 'À l\'instant';
        } else if (diff < 3600000) { // Moins d'une heure
            const minutes = Math.floor(diff / 60000);
            return `Il y a ${minutes} min`;
        } else if (diff < 86400000) { // Moins d'un jour
            const hours = Math.floor(diff / 3600000);
            return `Il y a ${hours} h`;
        } else {
            return date.toLocaleDateString('fr-FR');
        }
    } catch (e) {
        return timestamp;
    }
}

// Gestion des erreurs globales
window.addEventListener('error', function(e) {
    console.error('❌ Erreur globale:', e.error);
});

// Rendre les fonctions globales pour le débogage
window.analyzeArticle = analyzeArticle;
window.loadHistory = loadHistory;
window.loadStats = loadStats;

console.log('✅ script.js chargé avec succès');