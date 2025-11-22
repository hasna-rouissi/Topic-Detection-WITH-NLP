# Topic-Detection-WITH-NLP
A lightweight NLP system that detects new vs existing news articles using text preprocessing, MiniLM sentence embeddings, cosine similarity, and a threshold-based novelty classifier. Includes full preprocessing, embedding generation, novelty detection, evaluation, and a Flask app.

📘 Novelty Detection in News Articles
Detect new vs repeated articles using MiniLM sentence embeddings
🧠 Project Overview

This project implements a Novelty Detection System for news articles using state-of-the-art sentence embeddings (MiniLM) and cosine similarity.
Given a new article, the system determines whether it is novel or similar to existing content, enabling applications such as:

Duplicate article detection

News recommendation systems

Knowledge base update filtering

The project includes preprocessing, embedding generation, novelty detection, model evaluation, and a Flask/Streamlit demo application.

🔍 Problem Statement

News platforms generate thousands of articles every day.
Identifying whether a newly submitted article is new or similar to existing ones is essential for:

Avoiding redundant publications

Improving search and retrieval

Maintaining clean and updated knowledge bases

This project answers the question:
👉 "Given a new article, is it truly new or a repetition of past information?"

📂 Project Structure
📁 Projet-NLP/
│
├── 📁 data/
│   ├── data_preprocessed.csv
│   ├── data_small_with_embeddings.csv
│   ├── data_small_with_labels.csv
│   ├── embeddings_small_minilm.npy
│
├── 📁 notebooks/
│   ├── 01_preprocessing.ipynb
│   ├── 02_split_train_test.ipynb
│   ├── 03_generate_embeddings.ipynb
│   ├── 04_novelty_detection.ipynb
│   ├── 05_model_evaluation.ipynb
│
├── 📁 application/
│   ├── app.py (Flask or Streamlit)
│   ├── static/
│   ├── templates/
│
└── README.md

🛠️ Technologies
Task	Library
Text preprocessing	NLTK, regex
Embeddings	Sentence-Transformers (MiniLM-L6-v2)
Similarity computation	Scikit-learn
Evaluation	Precision, Recall, F1, BCE, Confusion Matrix
App	Flask / Streamlit
Visualization	Matplotlib, Seaborn
🔧 Installation
# 1. Clone the project
git clone https://github.com/yourusername/Novelty-Detection.git
cd Novelty-Detection

# 2. Create environment
conda create -n nlp-env python=3.10
conda activate nlp-env

# 3. Install dependencies
pip install -r requirements.txt
