import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      // Auth
      "auth.title": "AI Review Assistant",
      "auth.signIn": "Sign in to your account",
      "auth.signUp": "Create a new account",
      "auth.fullName": "Full Name",
      "auth.email": "Email",
      "auth.password": "Password",
      "auth.signInButton": "Sign In",
      "auth.signUpButton": "Sign Up",
      "auth.loading": "Loading...",
      "auth.noAccount": "Don't have an account? Sign up",
      "auth.hasAccount": "Already have an account? Sign in",
      "auth.welcomeBack": "Welcome back!",
      "auth.accountCreated": "Account created successfully!",
      
      // Header
      "header.title": "AI Review Assistant",
      "header.subtitle": "Analyze, Generate, and Approve Responses with Human-in-the-Loop AI",
      "header.dashboard": "Dashboard",
      "header.admin": "Admin",
      "header.signOut": "Sign Out",
      "header.signedOut": "Signed out successfully",
      
      // Dashboard
      "dashboard.title": "Reviews Dashboard",
      "dashboard.filters": "Filters",
      "dashboard.business": "Business",
      "dashboard.source": "Source",
      "dashboard.rating": "Rating",
      "dashboard.sentiment": "Sentiment",
      "dashboard.all": "All",
      "dashboard.google": "Google",
      "dashboard.facebook": "Facebook",
      "dashboard.yelp": "Yelp",
      "dashboard.appStore": "App Store",
      "dashboard.trustpilot": "Trustpilot",
      "dashboard.positive": "Positive",
      "dashboard.negative": "Negative",
      "dashboard.neutral": "Neutral",
      "dashboard.status": "Status",
      "dashboard.pending": "Pending",
      "dashboard.approved": "Approved",
      "dashboard.search": "Search reviews...",
      "dashboard.noReviews": "No reviews found",
      "dashboard.addReview": "Add your first review to get started",
      "dashboard.noReviewsFound": "No reviews found. Add some businesses and reviews to get started.",
      "dashboard.reviewsNeedingAction": "Reviews Needing Action",
      "dashboard.selectAll": "Select All",
      "dashboard.itemsNeedAction": "items need action. Select items or \"Select All\".",
      "dashboard.analyze": "Analyze",
      "dashboard.analyzing": "Analyzing...",
      "dashboard.analyzeSuccess": "Review analyzed successfully!",
      "dashboard.analyzeFailed": "Failed to analyze review",
      "dashboard.loading": "Loading reviews...",
      "dashboard.needsAction": "Needs Action",
      
      // Admin
      "admin.businesses": "Businesses",
      "admin.templates": "Response Templates",
      "admin.addBusiness": "Add Business",
      "admin.addTemplate": "Add Template",
      "admin.businessName": "Business Name",
      "admin.categories": "Categories (comma separated)",
      "admin.tags": "Tags (comma separated)",
      "admin.templateName": "Template Name",
      "admin.templateContent": "Template Content",
      "admin.cancel": "Cancel",
      "admin.save": "Save",
      "admin.edit": "Edit",
      "admin.delete": "Delete",
      
      // Common
      "common.loading": "Loading...",
      "common.error": "Error",
      "common.success": "Success"
    }
  },
  es: {
    translation: {
      // Auth
      "auth.title": "Asistente de Reseñas IA",
      "auth.signIn": "Iniciar sesión en tu cuenta",
      "auth.signUp": "Crear una nueva cuenta",
      "auth.fullName": "Nombre Completo",
      "auth.email": "Correo Electrónico",
      "auth.password": "Contraseña",
      "auth.signInButton": "Iniciar Sesión",
      "auth.signUpButton": "Registrarse",
      "auth.loading": "Cargando...",
      "auth.noAccount": "¿No tienes cuenta? Regístrate",
      "auth.hasAccount": "¿Ya tienes cuenta? Inicia sesión",
      "auth.welcomeBack": "¡Bienvenido de nuevo!",
      "auth.accountCreated": "¡Cuenta creada exitosamente!",
      
      // Header
      "header.title": "Asistente de Reseñas IA",
      "header.subtitle": "Analiza, Genera y Aprueba Respuestas con IA de Control Humano",
      "header.dashboard": "Panel",
      "header.admin": "Admin",
      "header.signOut": "Cerrar Sesión",
      "header.signedOut": "Sesión cerrada exitosamente",
      
      // Dashboard
      "dashboard.title": "Panel de Reseñas",
      "dashboard.filters": "Filtros",
      "dashboard.business": "Negocio",
      "dashboard.source": "Fuente",
      "dashboard.rating": "Calificación",
      "dashboard.sentiment": "Sentimiento",
      "dashboard.all": "Todos",
      "dashboard.google": "Google",
      "dashboard.facebook": "Facebook",
      "dashboard.yelp": "Yelp",
      "dashboard.appStore": "App Store",
      "dashboard.trustpilot": "Trustpilot",
      "dashboard.positive": "Positivo",
      "dashboard.negative": "Negativo",
      "dashboard.neutral": "Neutral",
      "dashboard.status": "Estado",
      "dashboard.pending": "Pendiente",
      "dashboard.approved": "Aprobado",
      "dashboard.search": "Buscar reseñas...",
      "dashboard.noReviews": "No se encontraron reseñas",
      "dashboard.addReview": "Agrega tu primera reseña para comenzar",
      "dashboard.noReviewsFound": "No se encontraron reseñas. Agrega algunos negocios y reseñas para comenzar.",
      "dashboard.reviewsNeedingAction": "Reseñas que Requieren Acción",
      "dashboard.selectAll": "Seleccionar Todo",
      "dashboard.itemsNeedAction": "elementos necesitan acción. Selecciona elementos o \"Seleccionar Todo\".",
      "dashboard.analyze": "Analizar",
      "dashboard.analyzing": "Analizando...",
      "dashboard.analyzeSuccess": "¡Reseña analizada exitosamente!",
      "dashboard.analyzeFailed": "Error al analizar la reseña",
      "dashboard.loading": "Cargando reseñas...",
      "dashboard.needsAction": "Requiere Acción",
      
      // Admin
      "admin.businesses": "Negocios",
      "admin.templates": "Plantillas de Respuesta",
      "admin.addBusiness": "Agregar Negocio",
      "admin.addTemplate": "Agregar Plantilla",
      "admin.businessName": "Nombre del Negocio",
      "admin.categories": "Categorías (separadas por comas)",
      "admin.tags": "Etiquetas (separadas por comas)",
      "admin.templateName": "Nombre de Plantilla",
      "admin.templateContent": "Contenido de Plantilla",
      "admin.cancel": "Cancelar",
      "admin.save": "Guardar",
      "admin.edit": "Editar",
      "admin.delete": "Eliminar",
      
      // Common
      "common.loading": "Cargando...",
      "common.error": "Error",
      "common.success": "Éxito"
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
