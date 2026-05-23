import { useState, useEffect } from 'react';

const translations = {
  en: {
    appName: "FraudShield AI",
    dashboard: "Dashboard",
    simulator: "Payment Simulator",
    transactions: "Transactions",
    rules: "Rules Engine",
    cardholderName: "Cardholder Name",
    cardNumber: "Credit Card Number",
    expiryDate: "Expiry Date (MM/YY)",
    cvv: "CVV Code",
    amount: "Amount ($)",
    merchant: "Merchant Name",
    merchantCategory: "Merchant Category",
    mlModel: "ML Model Classifier",
    submit: "Submit Transaction",
    status: "Status",
    riskScore: "Risk Score",
    decision: "Decision",
    details: "Details",
    brand: "Brand",
    issuer: "Bank Issuer",
    country: "Country",
    cardType: "Card Type",
    exportCSV: "Export CSV",
    exportExcel: "Export Excel",
    exportPDF: "Export PDF",
    searchCardholder: "Search Cardholder...",
    actions: "Actions",
    noTransactions: "No transactions found",
    cardPreview: "Card Preview",
    explainableAI: "Explainable AI Metrics",
    featureImportance: "Feature Importance & Contributions",
    overrideReason: "System Override Reason",
    activeRules: "Active Detection Rules",
    addRule: "Add New Rule",
    ruleName: "Rule Name",
    ruleType: "Rule Type",
    ruleValue: "Rule Value / Limit",
    ruleAction: "Rule Action",
    recentAlerts: "Recent Fraud Alerts",
    home: "Home",
    lightMode: "Light Mode",
    darkMode: "Dark Mode",
    selectLanguage: "Language"
  },
  es: {
    appName: "FraudShield AI",
    dashboard: "Panel de Control",
    simulator: "Simulador de Pago",
    transactions: "Transacciones",
    rules: "Reglas de Detección",
    cardholderName: "Nombre del Titular",
    cardNumber: "Número de Tarjeta",
    expiryDate: "Fecha de Vencimiento (MM/AA)",
    cvv: "Código CVV",
    amount: "Monto ($)",
    merchant: "Nombre del Comercio",
    merchantCategory: "Categoría de Comercio",
    mlModel: "Clasificador de Modelo ML",
    submit: "Enviar Transacción",
    status: "Estado",
    riskScore: "Puntuación de Riesgo",
    decision: "Decisión",
    details: "Detalles",
    brand: "Marca",
    issuer: "Banco Emisor",
    country: "País",
    cardType: "Tipo de Tarjeta",
    exportCSV: "Exportar CSV",
    exportExcel: "Exportar Excel",
    exportPDF: "Exportar PDF",
    searchCardholder: "Buscar Titular...",
    actions: "Acciones",
    noTransactions: "No se encontraron transacciones",
    cardPreview: "Vista Previa de Tarjeta",
    explainableAI: "Métricas de IA Explicable",
    featureImportance: "Importancia de Características",
    overrideReason: "Razón de Anulación del Sistema",
    activeRules: "Reglas de Detección Activas",
    addRule: "Agregar Nueva Regla",
    ruleName: "Nombre de la Regla",
    ruleType: "Tipo de Regla",
    ruleValue: "Valor / Límite de la Regla",
    ruleAction: "Acción de la Regla",
    recentAlerts: "Alertas Recientes de Fraude",
    home: "Inicio",
    lightMode: "Modo Claro",
    darkMode: "Modo Oscuro",
    selectLanguage: "Idioma"
  },
  hi: {
    appName: "FraudShield AI",
    dashboard: "डैशबोर्ड",
    simulator: "भुगतान सिम्युलेटर",
    transactions: "लेन-देन इतिहास",
    rules: "नियम इंजन",
    cardholderName: "कार्डधारक का नाम",
    cardNumber: "क्रेडिट कार्ड नंबर",
    expiryDate: "समाप्ति तिथि (MM/YY)",
    cvv: "सीवीवी कोड",
    amount: "राशि ($)",
    merchant: "व्यापारी का नाम",
    merchantCategory: "व्यापारी श्रेणी",
    mlModel: "एमएल मॉडल वर्गीकारक",
    submit: "भुगतान संसाधित करें",
    status: "स्थिति",
    riskScore: "जोखिम स्कोर",
    decision: "निर्णय",
    details: "विवरण",
    brand: "ब्रांड",
    issuer: "जारीकर्ता बैंक",
    country: "देश",
    cardType: "कार्ड प्रकार",
    exportCSV: "सीएसवी निर्यात करें",
    exportExcel: "एक्सेल निर्यात करें",
    exportPDF: "पीडीएफ निर्यात करें",
    searchCardholder: "कार्डधारक खोजें...",
    actions: "कार्रवाई",
    noTransactions: "कोई लेनदेन नहीं मिला",
    cardPreview: "कार्ड पूर्वावलोकन",
    explainableAI: "स्पष्ट करने योग्य एआई",
    featureImportance: "विशेषता महत्व और योगदान",
    overrideReason: "सिस्टम ओवरराइड का कारण",
    activeRules: "सक्रिय डिटेक्शन नियम",
    addRule: "नया नियम जोड़ें",
    ruleName: "नियम का नाम",
    ruleType: "नियम का प्रकार",
    ruleValue: "नियम सीमा / मान",
    ruleAction: "नियम कार्रवाई",
    recentAlerts: "हालिया धोखाधड़ी अलर्ट",
    home: "होम",
    lightMode: "लाइट मोड",
    darkMode: "डार्क मोड",
    selectLanguage: "भाषा"
  },
  fr: {
    appName: "FraudShield AI",
    dashboard: "Tableau de Bord",
    simulator: "Simulateur de Paiement",
    transactions: "Transactions",
    rules: "Moteur de Règles",
    cardholderName: "Nom du Titulaire",
    cardNumber: "Numéro de Carte",
    expiryDate: "Date d'Expiration (MM/AA)",
    cvv: "Code CVV",
    amount: "Montant ($)",
    merchant: "Nom du Marchand",
    merchantCategory: "Catégorie de Marchand",
    mlModel: "Modèle ML Classificateur",
    submit: "Soumettre la Transaction",
    status: "Statut",
    riskScore: "Score de Risque",
    decision: "Décision",
    details: "Détails",
    brand: "Marque",
    issuer: "Banque Émettrice",
    country: "Pays",
    cardType: "Type de Carte",
    exportCSV: "Exporter en CSV",
    exportExcel: "Exporter en Excel",
    exportPDF: "Exporter en PDF",
    searchCardholder: "Rechercher un Titulaire...",
    actions: "Actions",
    noTransactions: "Aucune transaction trouvée",
    cardPreview: "Aperçu de la Carte",
    explainableAI: "IA Explicable",
    featureImportance: "Importance des Caractéristiques",
    overrideReason: "Raison d'Annulation du Système",
    activeRules: "Règles de Detections Actives",
    addRule: "Ajouter une Règle",
    ruleName: "Nom de la Règle",
    ruleType: "Type de Règle",
    ruleValue: "Valeur / Limite de la Règle",
    ruleAction: "Action de la Règle",
    recentAlerts: "Alertes Fraude Récentes",
    home: "Accueil",
    lightMode: "Mode Clair",
    darkMode: "Mode Sombre",
    selectLanguage: "Langue"
  }
};

let currentLanguage = localStorage.getItem('language') || 'en';
const listeners = new Set();

export const getLanguage = () => currentLanguage;

export const setLanguage = (lang) => {
  if (translations[lang]) {
    currentLanguage = lang;
    localStorage.setItem('language', lang);
    listeners.forEach(listener => listener(lang));
  }
};

export const translate = (key) => {
  return translations[currentLanguage][key] || translations['en'][key] || key;
};

export const useTranslation = () => {
  const [lang, setLangState] = useState(currentLanguage);

  useEffect(() => {
    const handleLangChange = (newLang) => {
      setLangState(newLang);
    };
    listeners.add(handleLangChange);
    return () => {
      listeners.delete(handleLangChange);
    };
  }, []);

  return {
    t: (key) => translations[lang][key] || translations['en'][key] || key,
    currentLanguage: lang,
    changeLanguage: setLanguage
  };
};
