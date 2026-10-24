import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

export type SupportedLang = 'ar' | 'en' | 'fr' | 'es' | 'de' | 'tr';

export interface LanguageInfo {
  code: SupportedLang;
  name: string;
  nativeName: string;
  flag: string;
  dir: 'rtl' | 'ltr';
  locale: string;
  currencySymbol: string;
}

export const LANGUAGES: LanguageInfo[] = [
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇪🇬', dir: 'rtl', locale: 'ar-EG', currencySymbol: 'ج.م' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', dir: 'ltr', locale: 'en-US', currencySymbol: 'EGP' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', dir: 'ltr', locale: 'fr-FR', currencySymbol: 'EGP' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', dir: 'ltr', locale: 'es-ES', currencySymbol: 'EGP' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', dir: 'ltr', locale: 'de-DE', currencySymbol: 'EGP' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷', dir: 'ltr', locale: 'tr-TR', currencySymbol: 'EGP' },
];

type TranslationDict = Record<string, string>;

const translations: Record<SupportedLang, TranslationDict> = {
  ar: {
    // Brand & Meta
    'site.name': 'سوق مصر',
    'site.tagline': 'منصة التجارة الإلكترونية الأولى في مصر',
    'site.description': 'تسوّق من أفضل البائعين المعتمدين في مصر. إلكترونيات، أزياء، كتب، ومستلزمات منزلية بضمان الجودة وأسرع توصيل.',

    // Top Promo Bar
    'topbar.promo': 'شحن مجاني للطلبات فوق 1000 ج.م — استخدم كود WELCOME10 لخصم 10% فوري!',
    'topbar.authentic': 'منتجات أصلية 100%',
    'topbar.fastDelivery': 'توصيل سريع لجميع المحافظات',
    'topbar.sellWithUs': 'بع معنا على المنصة',

    // Header & Navigation
    'nav.searchPlaceholder': 'ابحث عن منتجات، ماركات، أو أقسام...',
    'nav.searchAria': 'ابحث عن منتجات',
    'nav.home': 'الرئيسية',
    'nav.products': 'المنتجات',
    'nav.notifications': 'الإشعارات',
    'nav.wishlist': 'المفضلة',
    'nav.cart': 'سلة التسوق',
    'nav.login': 'تسجيل الدخول',
    'nav.register': 'إنشاء حساب',
    'nav.profile': 'حسابي',
    'nav.orders': 'طلباتي',
    'nav.vendorDashboard': 'لوحة البائع',
    'nav.adminDashboard': 'لوحة الإدارة',
    'nav.logout': 'تسجيل الخروج',
    'nav.theme': 'المظهر',
    'nav.lightMode': 'الوضع الفاتح',
    'nav.darkMode': 'الوضع الداكن',
    'nav.language': 'اللغة',
    'nav.menu': 'القائمة',
    'nav.plusBadge': 'بلس',
    'nav.proBadge': 'برو',

    // Hero Section
    'hero.badge': 'المنصة رقم #1 للتسوق الذكي والآمن',
    'hero.title': 'تجربة تسوّق استثنائية من أفضل المتاجر المعتمدة',
    'hero.subtitle': 'اكتشف آلاف المنتجات الأصلية في الإلكترونيات، الأزياء، الكتب، ومستلزمات المنزل بأسعار تنافسية وضمان استرجاع كامل.',
    'hero.ctaPrimary': 'تصفّح المنتجات الآن',
    'hero.ctaSecondary': 'افتح متجرك مجاناً',
    'hero.statProducts': 'منتج أصلي ومضمون',
    'hero.statCustomers': 'عميل يثق بنا',
    'hero.statRating': 'تقييم تجربة الشراء',
    'hero.floatingVerified': 'بائعون معتمدون وموثقون',
    'hero.floatingDiscount': 'خصومات تصل إلى 40%',

    // Trust Features
    'features.shipping.title': 'توصيل فائق السرعة',
    'features.shipping.desc': 'تتبع شحنتك لحظة بلحظة حتى باب منزلك في جميع المحافظات',
    'features.secure.title': 'دفع آمن 100%',
    'features.secure.desc': 'دفع عند الاستلام أو عبر البطاقات البنكية والمحافظ الإلكترونية',
    'features.returns.title': 'استرجاع سهل ومضمون',
    'features.returns.desc': 'سياسة استبدال واسترجاع مرنة خلال 14 يوماً بدون تعقيد',
    'features.support.title': 'دعم فني على مدار الساعة',
    'features.support.desc': 'فريق خدمة عملاء ومساعد ذكي جاهز لمساعدتك في أي وقت',

    // Sections
    'section.categories': 'تسوّق حسب الفئة',
    'section.categoriesSub': 'اختر القسم المفضل لديك واستكشف أحدث العروض',
    'section.featured': 'المنتجات المختارة بعناية',
    'section.featuredSub': 'أفضل المنتجات الأعلى تقييماً ومبيعاً هذا الأسبوع',
    'section.newArrivals': 'وصل حديثاً للمتجر',
    'section.newArrivalsSub': 'أحدث الإضافات الحصرية من شركائنا المعتمدين',
    'section.viewAll': 'عرض الكل',

    // Promo Banner
    'promo.badge': 'عرض حصري لفترة محدودة',
    'promo.title': 'احصل على خصم إضافي 10% على طلبك الأول!',
    'promo.desc': 'انسخ كود الخصم واستخدمه في سلة التسوق للاستفادة من العرض فوراً على جميع الأقسام.',
    'promo.copyBtn': 'انسخ الكود: WELCOME10',
    'promo.copied': 'تم نسخ كود الخصم WELCOME10 بنجاح!',

    // Product Card & Details
    'product.addToCart': 'أضف للسلة',
    'product.outOfStock': 'نفذ من المخزون',
    'product.inStock': 'متوفر في المخزون',
    'product.addedToCart': 'تمت الإضافة للسلة بنجاح',
    'product.loginFirst': 'سجّل الدخول أولاً لإضافة المنتجات للسلة',
    'product.reviews': 'تقييم',
    'product.featured': 'مميز',
    'product.new': 'جديد',

    // Products Page & Filters
    'catalog.title': 'جميع المنتجات',
    'catalog.subtitle': 'استكشف مجموعتنا الكاملة من المنتجات الأصلية',
    'catalog.filters': 'تصفية النتائج',
    'catalog.categories': 'الأقسام',
    'catalog.allCategories': 'جميع الأقسام',
    'catalog.priceRange': 'نطاق السعر',
    'catalog.minPrice': 'من',
    'catalog.maxPrice': 'إلى',
    'catalog.applyFilter': 'تطبيق',
    'catalog.resetFilters': 'إعادة ضبط الفلاتر',
    'catalog.sortBy': 'ترتيب حسب:',
    'catalog.sortNewest': 'الأحدث أولاً',
    'catalog.sortPriceAsc': 'السعر: من الأقل للأعلى',
    'catalog.sortPriceDesc': 'السعر: من الأعلى للأقل',
    'catalog.sortRating': 'الأعلى تقييماً',
    'catalog.sortBestselling': 'الأكثر مبيعاً',
    'catalog.noProducts': 'لا توجد منتجات مطابقة لبحثك',
    'catalog.noProductsDesc': 'جرّب تغيير كلمات البحث أو إزالة بعض الفلاتر لعرض نتائج أكثر.',
    'catalog.showingResults': 'عرض النتائج',

    // Cart & Checkout
    'cart.title': 'سلة التسوق',
    'cart.empty': 'سلة التسوق فارغة حالياً',
    'cart.emptyDesc': 'لم تقم بإضافة أي منتجات للسلة بعد. ابدأ التسوق الآن واستمتع بأفضل العروض!',
    'cart.startShopping': 'ابدأ التسوق الآن',
    'cart.summary': 'ملخص الطلب',
    'cart.subtotal': 'المجموع الفرعي',
    'cart.shipping': 'رسوم الشحن',
    'cart.discount': 'الخصم',
    'cart.total': 'الإجمالي النهائي',
    'cart.couponPlaceholder': 'أدخل كود الخصم (مثل WELCOME10)',
    'cart.applyCoupon': 'تطبيق',
    'cart.checkoutBtn': 'إتمام الشراء الآن',

    // Auth Pages
    'auth.backToStore': 'العودة للمتجر',
    'auth.loginTitle': 'مرحباً بعودتك',
    'auth.loginSubtitle': 'سجّل الدخول لمتابعة التسوق وإدارة طلباتك بسهولة',
    'auth.email': 'البريد الإلكتروني',
    'auth.password': 'كلمة المرور',
    'auth.forgotPassword': 'نسيت كلمة المرور؟',
    'auth.loginBtn': 'تسجيل الدخول',
    'auth.loggingIn': 'جاري تسجيل الدخول...',
    'auth.noAccount': 'ليس لديك حساب؟',
    'auth.createAccount': 'إنشاء حساب جديد',
    'auth.wantToSell': 'تريد البيع معنا؟',
    'auth.registerStore': 'سجّل متجرك الآن',

    // Footer
    'footer.quickLinks': 'روابط سريعة',
    'footer.customerService': 'خدمة العملاء',
    'footer.returnPolicy': 'سياسة الاستبدال والاسترجاع',
    'footer.shippingPolicy': 'الشحن والتوصيل',
    'footer.faq': 'الأسئلة الشائعة',
    'footer.contact': 'تواصل معنا',
    'footer.joinAsVendor': 'انضم كشريك نجاح',
    'footer.registerVendor': 'سجّل متجرك كبائع',
    'footer.terms': 'شروط الاستخدام',
    'footer.privacy': 'سياسة الخصوصية',
    'footer.rights': 'جميع الحقوق محفوظة',

    // Categories
    'cat.electronics': 'إلكترونيات',
    'cat.books': 'كتب وروايات',
    'cat.clothing': 'ملابس وأزياء',
    'cat.home-kitchen': 'المنزل والمطبخ',
    'cat.phones': 'هواتف ذكية',
    'cat.headphones': 'سماعات وصوتيات',
    'cat.cameras': 'كاميرات وتصوير',
    'cat.accessories': 'إكسسوارات تقنية',

    // Order Statuses
    'status.pending': 'قيد الانتظار',
    'status.confirmed': 'مؤكد',
    'status.processing': 'قيد التجهيز',
    'status.shipped': 'تم الشحن',
    'status.delivered': 'تم التوصيل',
    'status.cancelled': 'ملغي',
    'status.refunded': 'مسترجع',
  },

  en: {
    'site.name': 'Souq Misr',
    'site.tagline': 'Premier Multi-Vendor E-Commerce Platform',
    'site.description': 'Shop from top verified sellers. Electronics, fashion, books, and home essentials with guaranteed quality and express delivery.',

    'topbar.promo': 'Free shipping on orders over 1,000 EGP — Use code WELCOME10 for 10% OFF!',
    'topbar.authentic': '100% Authentic Products',
    'topbar.fastDelivery': 'Express Nationwide Delivery',
    'topbar.sellWithUs': 'Sell on Souq Misr',

    'nav.searchPlaceholder': 'Search products, brands, or categories...',
    'nav.searchAria': 'Search products',
    'nav.home': 'Home',
    'nav.products': 'Explore',
    'nav.notifications': 'Notifications',
    'nav.wishlist': 'Wishlist',
    'nav.cart': 'Cart',
    'nav.login': 'Sign In',
    'nav.register': 'Sign Up',
    'nav.profile': 'My Profile',
    'nav.orders': 'My Orders',
    'nav.vendorDashboard': 'Seller Hub',
    'nav.adminDashboard': 'Admin Console',
    'nav.logout': 'Sign Out',
    'nav.theme': 'Appearance',
    'nav.lightMode': 'Light Mode',
    'nav.darkMode': 'Dark Mode',
    'nav.language': 'Language',
    'nav.menu': 'Menu',
    'nav.plusBadge': 'PLUS',
    'nav.proBadge': 'PRO',

    'hero.badge': '#1 Trusted Multi-Vendor Marketplace',
    'hero.title': 'Next-Generation Shopping from Verified Brands',
    'hero.subtitle': 'Discover thousands of authentic electronics, fashion, books, and lifestyle essentials with buyer protection and lightning-fast delivery.',
    'hero.ctaPrimary': 'Explore Collection',
    'hero.ctaSecondary': 'Become a Seller',
    'hero.statProducts': 'Authentic Products',
    'hero.statCustomers': 'Happy Shoppers',
    'hero.statRating': 'Customer Satisfaction',
    'hero.floatingVerified': '100% Verified Merchants',
    'hero.floatingDiscount': 'Up to 40% Exclusive Deals',

    'features.shipping.title': 'Lightning-Fast Delivery',
    'features.shipping.desc': 'Real-time shipment tracking straight to your doorstep nationwide',
    'features.secure.title': '100% Secure Payments',
    'features.secure.desc': 'Cash on delivery, credit/debit cards, and mobile wallets supported',
    'features.returns.title': 'Hassle-Free Returns',
    'features.returns.desc': '14-day money-back guarantee on all eligible marketplace orders',
    'features.support.title': '24/7 Dedicated Support',
    'features.support.desc': 'AI shopping assistant and live customer care ready around the clock',

    'section.categories': 'Shop by Category',
    'section.categoriesSub': 'Browse curated collections tailored to your lifestyle',
    'section.featured': 'Featured Masterpieces',
    'section.featuredSub': 'Top-rated and most popular picks curated by our experts',
    'section.newArrivals': 'Fresh New Arrivals',
    'section.newArrivalsSub': 'The latest releases from our verified partner stores',
    'section.viewAll': 'View All',

    'promo.badge': 'Limited-Time Exclusive Offer',
    'promo.title': 'Get an Extra 10% OFF Your First Order!',
    'promo.desc': 'Copy the promo code below and apply it at checkout to enjoy instant savings across all categories.',
    'promo.copyBtn': 'Copy Code: WELCOME10',
    'promo.copied': 'Promo code WELCOME10 copied to clipboard!',

    'product.addToCart': 'Add to Cart',
    'product.outOfStock': 'Out of Stock',
    'product.inStock': 'In Stock',
    'product.addedToCart': 'Added to your cart',
    'product.loginFirst': 'Please sign in first to add items to your cart',
    'product.reviews': 'reviews',
    'product.featured': 'Featured',
    'product.new': 'New',

    'catalog.title': 'All Products',
    'catalog.subtitle': 'Browse our complete catalog of verified authentic items',
    'catalog.filters': 'Filters',
    'catalog.categories': 'Categories',
    'catalog.allCategories': 'All Categories',
    'catalog.priceRange': 'Price Range',
    'catalog.minPrice': 'Min',
    'catalog.maxPrice': 'Max',
    'catalog.applyFilter': 'Apply',
    'catalog.resetFilters': 'Reset Filters',
    'catalog.sortBy': 'Sort by:',
    'catalog.sortNewest': 'Newest Arrivals',
    'catalog.sortPriceAsc': 'Price: Low to High',
    'catalog.sortPriceDesc': 'Price: High to Low',
    'catalog.sortRating': 'Highest Rated',
    'catalog.sortBestselling': 'Best Selling',
    'catalog.noProducts': 'No matching products found',
    'catalog.noProductsDesc': 'Try adjusting your search keywords or clearing active filters.',
    'catalog.showingResults': 'Showing results',

    'cart.title': 'Shopping Cart',
    'cart.empty': 'Your shopping cart is empty',
    'cart.emptyDesc': 'Explore our catalog and add your favorite products to get started.',
    'cart.startShopping': 'Start Shopping',
    'cart.summary': 'Order Summary',
    'cart.subtotal': 'Subtotal',
    'cart.shipping': 'Shipping Fee',
    'cart.discount': 'Discount',
    'cart.total': 'Total',
    'cart.couponPlaceholder': 'Enter promo code (e.g. WELCOME10)',
    'cart.applyCoupon': 'Apply',
    'cart.checkoutBtn': 'Proceed to Checkout',

    'auth.backToStore': 'Back to Store',
    'auth.loginTitle': 'Welcome Back',
    'auth.loginSubtitle': 'Sign in to access your orders, wishlist, and personalized deals',
    'auth.email': 'Email Address',
    'auth.password': 'Password',
    'auth.forgotPassword': 'Forgot password?',
    'auth.loginBtn': 'Sign In',
    'auth.loggingIn': 'Signing in...',
    'auth.noAccount': "Don't have an account?",
    'auth.createAccount': 'Create an account',
    'auth.wantToSell': 'Want to sell with us?',
    'auth.registerStore': 'Open your store',

    'footer.quickLinks': 'Quick Links',
    'footer.customerService': 'Customer Care',
    'footer.returnPolicy': 'Return & Refund Policy',
    'footer.shippingPolicy': 'Shipping Information',
    'footer.faq': 'Help Center & FAQ',
    'footer.contact': 'Contact Us',
    'footer.joinAsVendor': 'Partner With Us',
    'footer.registerVendor': 'Become a Verified Seller',
    'footer.terms': 'Terms of Service',
    'footer.privacy': 'Privacy Policy',
    'footer.rights': 'All rights reserved',

    'cat.electronics': 'Electronics',
    'cat.books': 'Books & Literature',
    'cat.clothing': 'Fashion & Apparel',
    'cat.home-kitchen': 'Home & Kitchen',
    'cat.phones': 'Smartphones',
    'cat.headphones': 'Audio & Headphones',
    'cat.cameras': 'Cameras & Photo',
    'cat.accessories': 'Tech Accessories',

    'status.pending': 'Pending',
    'status.confirmed': 'Confirmed',
    'status.processing': 'Processing',
    'status.shipped': 'Shipped',
    'status.delivered': 'Delivered',
    'status.cancelled': 'Cancelled',
    'status.refunded': 'Refunded',
  },

  fr: {
    'site.name': 'Souq Misr',
    'site.tagline': 'La Première Plateforme E-Commerce Multi-Vendeurs',
    'site.description': 'Achetez auprès des meilleurs vendeurs vérifiés. Électronique, mode, livres et maison avec livraison rapide.',

    'topbar.promo': 'Livraison gratuite dès 1 000 EGP — Code WELCOME10 pour -10% immédiat !',
    'topbar.authentic': 'Produits 100% Authentiques',
    'topbar.fastDelivery': 'Livraison Express',
    'topbar.sellWithUs': 'Vendre sur Souq Misr',

    'nav.searchPlaceholder': 'Rechercher des produits, marques ou catégories...',
    'nav.searchAria': 'Rechercher des produits',
    'nav.home': 'Accueil',
    'nav.products': 'Produits',
    'nav.notifications': 'Notifications',
    'nav.wishlist': 'Favoris',
    'nav.cart': 'Panier',
    'nav.login': 'Connexion',
    'nav.register': "S'inscrire",
    'nav.profile': 'Mon Profil',
    'nav.orders': 'Mes Commandes',
    'nav.vendorDashboard': 'Espace Vendeur',
    'nav.adminDashboard': 'Administration',
    'nav.logout': 'Déconnexion',
    'nav.theme': 'Thème',
    'nav.lightMode': 'Mode Clair',
    'nav.darkMode': 'Mode Sombre',
    'nav.language': 'Langue',
    'nav.menu': 'Menu',
    'nav.plusBadge': 'PLUS',
    'nav.proBadge': 'PRO',

    'hero.badge': 'Marketplace N°1 Certifiée et Sécurisée',
    'hero.title': "L'Excellence du Shopping auprès de Boutiques Vérifiées",
    'hero.subtitle': 'Découvrez des milliers de produits authentiques : électronique, mode, livres et maison avec garantie satisfait ou remboursé.',
    'hero.ctaPrimary': 'Explorer le Catalogue',
    'hero.ctaSecondary': 'Devenir Vendeur',
    'hero.statProducts': 'Produits Authentiques',
    'hero.statCustomers': 'Clients Satisfaits',
    'hero.statRating': 'Note Moyenne',
    'hero.floatingVerified': 'Vendeurs 100% Certifiés',
    'hero.floatingDiscount': "Jusqu'à -40% d'Offres",

    'features.shipping.title': 'Livraison Ultra-Rapide',
    'features.shipping.desc': 'Suivi en temps réel de votre colis jusqu’à votre porte',
    'features.secure.title': 'Paiement 100% Sécurisé',
    'features.secure.desc': 'Paiement à la livraison, cartes bancaires et portefeuilles mobiles',
    'features.returns.title': 'Retours Simplifiés',
    'features.returns.desc': 'Garantie de remboursement sous 14 jours sans tracas',
    'features.support.title': 'Assistance 24h/24 et 7j/7',
    'features.support.desc': 'Assistant IA et équipe dédiée à votre écoute à tout moment',

    'section.categories': 'Acheter par Catégorie',
    'section.categoriesSub': 'Parcourez nos sélections adaptées à vos envies',
    'section.featured': 'Sélection Vedette',
    'section.featuredSub': 'Les produits les mieux notés et les plus populaires',
    'section.newArrivals': 'Nouveautés',
    'section.newArrivalsSub': 'Les derniers arrivages de nos boutiques partenaires',
    'section.viewAll': 'Tout Voir',

    'promo.badge': 'Offre Exclusive à Durée Limitée',
    'promo.title': 'Profitez de -10% Supplémentaires sur Votre 1ère Commande !',
    'promo.desc': 'Copiez le code promo ci-dessous et appliquez-le dans votre panier pour économiser immédiatement.',
    'promo.copyBtn': 'Copier : WELCOME10',
    'promo.copied': 'Code promo WELCOME10 copié !',

    'product.addToCart': 'Ajouter au Panier',
    'product.outOfStock': 'Rupture de Stock',
    'product.inStock': 'En Stock',
    'product.addedToCart': 'Ajouté au panier',
    'product.loginFirst': 'Connectez-vous pour ajouter au panier',
    'product.reviews': 'avis',
    'product.featured': 'Vedette',
    'product.new': 'Nouveau',

    'catalog.title': 'Tous les Produits',
    'catalog.subtitle': 'Explorez notre catalogue complet de produits certifiés',
    'catalog.filters': 'Filtres',
    'catalog.categories': 'Catégories',
    'catalog.allCategories': 'Toutes les Catégories',
    'catalog.priceRange': 'Fourchette de Prix',
    'catalog.minPrice': 'Min',
    'catalog.maxPrice': 'Max',
    'catalog.applyFilter': 'Appliquer',
    'catalog.resetFilters': 'Réinitialiser',
    'catalog.sortBy': 'Trier par :',
    'catalog.sortNewest': 'Plus Récents',
    'catalog.sortPriceAsc': 'Prix : Croissant',
    'catalog.sortPriceDesc': 'Prix : Décroissant',
    'catalog.sortRating': 'Mieux Notés',
    'catalog.sortBestselling': 'Meilleures Ventes',
    'catalog.noProducts': 'Aucun produit trouvé',
    'catalog.noProductsDesc': 'Essayez de modifier vos critères de recherche ou vos filtres.',
    'catalog.showingResults': 'Résultats affichés',

    'cart.title': 'Mon Panier',
    'cart.empty': 'Votre panier est vide',
    'cart.emptyDesc': 'Découvrez nos produits et commencez vos achats dès maintenant.',
    'cart.startShopping': 'Commencer mes Achats',
    'cart.summary': 'Récapitulatif',
    'cart.subtotal': 'Sous-total',
    'cart.shipping': 'Livraison',
    'cart.discount': 'Remise',
    'cart.total': 'Total',
    'cart.couponPlaceholder': 'Code promo (ex: WELCOME10)',
    'cart.applyCoupon': 'Appliquer',
    'cart.checkoutBtn': 'Passer la Commande',

    'auth.backToStore': 'Retour à la Boutique',
    'auth.loginTitle': 'Bon Retour',
    'auth.loginSubtitle': 'Connectez-vous pour suivre vos commandes et accéder à vos offres',
    'auth.email': 'Adresse E-mail',
    'auth.password': 'Mot de passe',
    'auth.forgotPassword': 'Mot de passe oublié ?',
    'auth.loginBtn': 'Se Connecter',
    'auth.loggingIn': 'Connexion...',
    'auth.noAccount': 'Pas encore de compte ?',
    'auth.createAccount': 'Créer un compte',
    'auth.wantToSell': 'Vous souhaitez vendre ?',
    'auth.registerStore': 'Ouvrir une boutique',

    'footer.quickLinks': 'Liens Rapides',
    'footer.customerService': 'Service Client',
    'footer.returnPolicy': 'Politique de Retour',
    'footer.shippingPolicy': 'Livraison & Expédition',
    'footer.faq': 'Questions Fréquentes',
    'footer.contact': 'Contactez-nous',
    'footer.joinAsVendor': 'Devenir Partenaire',
    'footer.registerVendor': 'Ouvrir Votre Boutique',
    'footer.terms': "Conditions d'Utilisation",
    'footer.privacy': 'Confidentialité',
    'footer.rights': 'Tous droits réservés',

    'cat.electronics': 'Électronique',
    'cat.books': 'Livres & Romans',
    'cat.clothing': 'Mode & Vêtements',
    'cat.home-kitchen': 'Maison & Cuisine',
    'cat.phones': 'Smartphones',
    'cat.headphones': 'Casques & Audio',
    'cat.cameras': 'Appareils Photo',
    'cat.accessories': 'Accessoires Tech',

    'status.pending': 'En attente',
    'status.confirmed': 'Confirmée',
    'status.processing': 'En préparation',
    'status.shipped': 'Expédiée',
    'status.delivered': 'Livrée',
    'status.cancelled': 'Annulée',
    'status.refunded': 'Remboursée',
  },

  es: {
    'site.name': 'Souq Misr',
    'site.tagline': 'Plataforma Líder de Comercio Electrónico',
    'site.description': 'Compra de los mejores vendedores verificados. Electrónica, moda, libros y hogar con envío rápido y seguro.',

    'topbar.promo': 'Envío gratis en pedidos superiores a 1.000 EGP — ¡Usa WELCOME10 para 10% DTO!',
    'topbar.authentic': '100% Productos Auténticos',
    'topbar.fastDelivery': 'Envío Rápido Nacional',
    'topbar.sellWithUs': 'Vende con Nosotros',

    'nav.searchPlaceholder': 'Buscar productos, marcas o categorías...',
    'nav.searchAria': 'Buscar productos',
    'nav.home': 'Inicio',
    'nav.products': 'Productos',
    'nav.notifications': 'Notificaciones',
    'nav.wishlist': 'Favoritos',
    'nav.cart': 'Carrito',
    'nav.login': 'Iniciar Sesión',
    'nav.register': 'Registrarse',
    'nav.profile': 'Mi Cuenta',
    'nav.orders': 'Mis Pedidos',
    'nav.vendorDashboard': 'Panel de Vendedor',
    'nav.adminDashboard': 'Panel Admin',
    'nav.logout': 'Cerrar Sesión',
    'nav.theme': 'Tema',
    'nav.lightMode': 'Modo Claro',
    'nav.darkMode': 'Modo Oscuro',
    'nav.language': 'Idioma',
    'nav.menu': 'Menú',
    'nav.plusBadge': 'PLUS',
    'nav.proBadge': 'PRO',

    'hero.badge': 'Marketplace #1 Verificado y Seguro',
    'hero.title': 'Compras de Nueva Generación en Tiendas Oficiales',
    'hero.subtitle': 'Descubre miles de artículos originales en electrónica, moda, libros y hogar con garantía total y entrega rápida.',
    'hero.ctaPrimary': 'Explorar Productos',
    'hero.ctaSecondary': 'Abrir mi Tienda',
    'hero.statProducts': 'Productos Originales',
    'hero.statCustomers': 'Clientes Felices',
    'hero.statRating': 'Valoración Media',
    'hero.floatingVerified': 'Vendedores Verificados',
    'hero.floatingDiscount': 'Hasta 40% de Descuento',

    'features.shipping.title': 'Envío Ultra Rápido',
    'features.shipping.desc': 'Seguimiento en tiempo real hasta la puerta de tu casa',
    'features.secure.title': 'Pago 100% Seguro',
    'features.secure.desc': 'Pago contra reembolso, tarjetas bancarias y billeteras digitales',
    'features.returns.title': 'Devoluciones Fáciles',
    'features.returns.desc': 'Garantía de devolución de 14 días sin complicaciones',
    'features.support.title': 'Soporte 24/7',
    'features.support.desc': 'Asistente inteligente y atención al cliente siempre disponible',

    'section.categories': 'Comprar por Categoría',
    'section.categoriesSub': 'Explora nuestras colecciones seleccionadas para ti',
    'section.featured': 'Productos Destacados',
    'section.featuredSub': 'Los artículos mejor valorados y más vendidos de la semana',
    'section.newArrivals': 'Nuevos Lanzamientos',
    'section.newArrivalsSub': 'Las últimas novedades de nuestras tiendas asociadas',
    'section.viewAll': 'Ver Todo',

    'promo.badge': 'Oferta Exclusiva por Tiempo Limitado',
    'promo.title': '¡Obtén un 10% EXTRA de Descuento en tu Primer Pedido!',
    'promo.desc': 'Copia el código promocional y aplícalo al finalizar tu compra para ahorrar al instante.',
    'promo.copyBtn': 'Copiar: WELCOME10',
    'promo.copied': '¡Código WELCOME10 copiado!',

    'product.addToCart': 'Añadir al Carrito',
    'product.outOfStock': 'Agotado',
    'product.inStock': 'En Stock',
    'product.addedToCart': 'Añadido al carrito',
    'product.loginFirst': 'Inicia sesión para añadir productos',
    'product.reviews': 'reseñas',
    'product.featured': 'Destacado',
    'product.new': 'Nuevo',

    'catalog.title': 'Todos los Productos',
    'catalog.subtitle': 'Explora nuestro catálogo completo de productos verificados',
    'catalog.filters': 'Filtros',
    'catalog.categories': 'Categorías',
    'catalog.allCategories': 'Todas las Categorías',
    'catalog.priceRange': 'Rango de Precio',
    'catalog.minPrice': 'Mín',
    'catalog.maxPrice': 'Máx',
    'catalog.applyFilter': 'Aplicar',
    'catalog.resetFilters': 'Limpiar Filtros',
    'catalog.sortBy': 'Ordenar por:',
    'catalog.sortNewest': 'Más Recientes',
    'catalog.sortPriceAsc': 'Precio: Menor a Mayor',
    'catalog.sortPriceDesc': 'Precio: Mayor a Menor',
    'catalog.sortRating': 'Mejor Valorados',
    'catalog.sortBestselling': 'Más Vendidos',
    'catalog.noProducts': 'No se encontraron productos',
    'catalog.noProductsDesc': 'Prueba a cambiar tu búsqueda o restablecer los filtros.',
    'catalog.showingResults': 'Mostrando resultados',

    'cart.title': 'Carrito de Compras',
    'cart.empty': 'Tu carrito está vacío',
    'cart.emptyDesc': 'Explora nuestras categorías y añade tus productos favoritos.',
    'cart.startShopping': 'Ir de Compras',
    'cart.summary': 'Resumen del Pedido',
    'cart.subtotal': 'Subtotal',
    'cart.shipping': 'Envío',
    'cart.discount': 'Descuento',
    'cart.total': 'Total',
    'cart.couponPlaceholder': 'Código promocional (ej. WELCOME10)',
    'cart.applyCoupon': 'Aplicar',
    'cart.checkoutBtn': 'Finalizar Compra',

    'auth.backToStore': 'Volver a la Tienda',
    'auth.loginTitle': 'Bienvenido de Nuevo',
    'auth.loginSubtitle': 'Inicia sesión para gestionar tus pedidos y ofertas exclusivas',
    'auth.email': 'Correo Electrónico',
    'auth.password': 'Contraseña',
    'auth.forgotPassword': '¿Olvidaste tu contraseña?',
    'auth.loginBtn': 'Iniciar Sesión',
    'auth.loggingIn': 'Iniciando sesión...',
    'auth.noAccount': '¿No tienes cuenta?',
    'auth.createAccount': 'Crear cuenta',
    'auth.wantToSell': '¿Quieres vender?',
    'auth.registerStore': 'Registra tu tienda',

    'footer.quickLinks': 'Enlaces Rápidos',
    'footer.customerService': 'Atención al Cliente',
    'footer.returnPolicy': 'Política de Devoluciones',
    'footer.shippingPolicy': 'Envíos y Entregas',
    'footer.faq': 'Preguntas Frecuentes',
    'footer.contact': 'Contacto',
    'footer.joinAsVendor': 'Vende con Nosotros',
    'footer.registerVendor': 'Registra tu Tienda',
    'footer.terms': 'Términos de Uso',
    'footer.privacy': 'Política de Privacidad',
    'footer.rights': 'Todos los derechos reservados',

    'cat.electronics': 'Electrónica',
    'cat.books': 'Libros y Novelas',
    'cat.clothing': 'Moda y Ropa',
    'cat.home-kitchen': 'Hogar y Cocina',
    'cat.phones': 'Smartphones',
    'cat.headphones': 'Audio y Auriculares',
    'cat.cameras': 'Cámaras y Foto',
    'cat.accessories': 'Accesorios Tech',

    'status.pending': 'Pendiente',
    'status.confirmed': 'Confirmado',
    'status.processing': 'En proceso',
    'status.shipped': 'Enviado',
    'status.delivered': 'Entregado',
    'status.cancelled': 'Cancelado',
    'status.refunded': 'Reembolsado',
  },

  de: {
    'site.name': 'Souq Misr',
    'site.tagline': 'Die Führende Multi-Vendor E-Commerce Plattform',
    'site.description': 'Kaufen Sie bei geprüften Top-Händlern. Elektronik, Mode, Bücher und Wohnen mit schnellem Versand.',

    'topbar.promo': 'Kostenloser Versand ab 1.000 EGP — Code WELCOME10 für 10% Sofortrabatt!',
    'topbar.authentic': '100% Originalprodukte',
    'topbar.fastDelivery': 'Express-Lieferung',
    'topbar.sellWithUs': 'Verkaufen auf Souq Misr',

    'nav.searchPlaceholder': 'Produkte, Marken oder Kategorien suchen...',
    'nav.searchAria': 'Produkte suchen',
    'nav.home': 'Startseite',
    'nav.products': 'Produkte',
    'nav.notifications': 'Mitteilungen',
    'nav.wishlist': 'Wunschliste',
    'nav.cart': 'Warenkorb',
    'nav.login': 'Anmelden',
    'nav.register': 'Registrieren',
    'nav.profile': 'Mein Konto',
    'nav.orders': 'Bestellungen',
    'nav.vendorDashboard': 'Händler-Cockpit',
    'nav.adminDashboard': 'Admin-Bereich',
    'nav.logout': 'Abmelden',
    'nav.theme': 'Design',
    'nav.lightMode': 'Heller Modus',
    'nav.darkMode': 'Dunkler Modus',
    'nav.language': 'Sprache',
    'nav.menu': 'Menü',
    'nav.plusBadge': 'PLUS',
    'nav.proBadge': 'PRO',

    'hero.badge': '#1 Geprüfter & Sicherer Online-Marktplatz',
    'hero.title': 'Premium-Shopping bei Verifizierten Marken-Stores',
    'hero.subtitle': 'Entdecken Sie Tausende Originalprodukte aus Elektronik, Mode, Büchern und Lifestyle mit Käuferschutz und Blitzversand.',
    'hero.ctaPrimary': 'Sortiment Entdecken',
    'hero.ctaSecondary': 'Händler Werden',
    'hero.statProducts': 'Originalprodukte',
    'hero.statCustomers': 'Zufriedene Kunden',
    'hero.statRating': 'Kundenbewertung',
    'hero.floatingVerified': '100% Geprüfte Händler',
    'hero.floatingDiscount': 'Bis zu 40% Rabatt',

    'features.shipping.title': 'Blitzschneller Versand',
    'features.shipping.desc': 'Sendungsverfolgung in Echtzeit direkt bis an Ihre Haustür',
    'features.secure.title': '100% Sichere Zahlung',
    'features.secure.desc': 'Nachnahme, Kredit-/Debitkarten und Mobile Wallets',
    'features.returns.title': 'Einfache Rückgabe',
    'features.returns.desc': '14 Tage Geld-zurück-Garantie ohne Wenn und Aber',
    'features.support.title': '24/7 Kundensupport',
    'features.support.desc': 'KI-Assistent und persönlicher Support rund um die Uhr',

    'section.categories': 'Nach Kategorie Einkaufen',
    'section.categoriesSub': 'Entdecken Sie kuratierte Kollektionen für jeden Anspruch',
    'section.featured': 'Ausgewählte Highlights',
    'section.featuredSub': 'Die bestbewerteten und beliebtesten Produkte dieser Woche',
    'section.newArrivals': 'Neu Eingetroffen',
    'section.newArrivalsSub': 'Die neuesten Produkte unserer zertifizierten Partner',
    'section.viewAll': 'Alle Anzeigen',

    'promo.badge': 'Exklusives Zeitlich Begrenztes Angebot',
    'promo.title': 'Sichern Sie sich 10% EXTRA-Rabatt auf Ihre Erste Bestellung!',
    'promo.desc': 'Kopieren Sie den Gutscheincode und lösen Sie ihn im Warenkorb für sofortigen Rabatt ein.',
    'promo.copyBtn': 'Code Kopieren: WELCOME10',
    'promo.copied': 'Gutscheincode WELCOME10 kopiert!',

    'product.addToCart': 'In den Warenkorb',
    'product.outOfStock': 'Ausverkauft',
    'product.inStock': 'Auf Lager',
    'product.addedToCart': 'Zum Warenkorb hinzugefügt',
    'product.loginFirst': 'Bitte zuerst anmelden',
    'product.reviews': 'Bewertungen',
    'product.featured': 'Highlight',
    'product.new': 'Neu',

    'catalog.title': 'Alle Produkte',
    'catalog.subtitle': 'Durchsuchen Sie unseren gesamten Katalog geprüfter Artikel',
    'catalog.filters': 'Filter',
    'catalog.categories': 'Kategorien',
    'catalog.allCategories': 'Alle Kategorien',
    'catalog.priceRange': 'Preisspanne',
    'catalog.minPrice': 'Min',
    'catalog.maxPrice': 'Max',
    'catalog.applyFilter': 'Anwenden',
    'catalog.resetFilters': 'Filter Zurücksetzen',
    'catalog.sortBy': 'Sortieren nach:',
    'catalog.sortNewest': 'Neueste Zuerst',
    'catalog.sortPriceAsc': 'Preis: Aufsteigend',
    'catalog.sortPriceDesc': 'Preis: Absteigend',
    'catalog.sortRating': 'Beste Bewertung',
    'catalog.sortBestselling': 'Bestseller',
    'catalog.noProducts': 'Keine passenden Produkte gefunden',
    'catalog.noProductsDesc': 'Versuchen Sie andere Suchbegriffe oder setzen Sie die Filter zurück.',
    'catalog.showingResults': 'Ergebnisse werden angezeigt',

    'cart.title': 'Warenkorb',
    'cart.empty': 'Ihr Warenkorb ist leer',
    'cart.emptyDesc': 'Entdecken Sie unsere Angebote und legen Sie Ihre Lieblingsartikel in den Warenkorb.',
    'cart.startShopping': 'Jetzt Einkaufen',
    'cart.summary': 'Bestellübersicht',
    'cart.subtotal': 'Zwischensumme',
    'cart.shipping': 'Versandkosten',
    'cart.discount': 'Rabatt',
    'cart.total': 'Gesamtsumme',
    'cart.couponPlaceholder': 'Gutscheincode (z.B. WELCOME10)',
    'cart.applyCoupon': 'Einlösen',
    'cart.checkoutBtn': 'Zur Kasse Gehen',

    'auth.backToStore': 'Zurück zum Shop',
    'auth.loginTitle': 'Willkommen Zurück',
    'auth.loginSubtitle': 'Melden Sie sich an, um Ihre Bestellungen zu verwalten',
    'auth.email': 'E-Mail-Adresse',
    'auth.password': 'Passwort',
    'auth.forgotPassword': 'Passwort vergessen?',
    'auth.loginBtn': 'Anmelden',
    'auth.loggingIn': 'Anmeldung läuft...',
    'auth.noAccount': 'Noch kein Konto?',
    'auth.createAccount': 'Konto erstellen',
    'auth.wantToSell': 'Möchten Sie verkaufen?',
    'auth.registerStore': 'Shop eröffnen',

    'footer.quickLinks': 'Schnellzugriff',
    'footer.customerService': 'Kundenservice',
    'footer.returnPolicy': 'Rückgaberecht',
    'footer.shippingPolicy': 'Versand & Lieferung',
    'footer.faq': 'Häufige Fragen (FAQ)',
    'footer.contact': 'Kontakt',
    'footer.joinAsVendor': 'Partner Werden',
    'footer.registerVendor': 'Als Händler Registrieren',
    'footer.terms': 'Nutzungsbedingungen',
    'footer.privacy': 'Datenschutz',
    'footer.rights': 'Alle Rechte vorbehalten',

    'cat.electronics': 'Elektronik',
    'cat.books': 'Bücher & Literatur',
    'cat.clothing': 'Mode & Bekleidung',
    'cat.home-kitchen': 'Haus & Küche',
    'cat.phones': 'Smartphones',
    'cat.headphones': 'Audio & Kopfhörer',
    'cat.cameras': 'Kameras & Foto',
    'cat.accessories': 'Tech-Zubehör',

    'status.pending': 'Ausstehend',
    'status.confirmed': 'Bestätigt',
    'status.processing': 'In Bearbeitung',
    'status.shipped': 'Versandt',
    'status.delivered': 'Zugestellt',
    'status.cancelled': 'Storniert',
    'status.refunded': 'Erstattet',
  },

  tr: {
    'site.name': 'Souq Misr',
    'site.tagline': 'Lider Çok Satıcılı E-Ticaret Platformu',
    'site.description': 'Onaylı satıcılardan güvenle alışveriş yapın. Elektronik, moda, kitap ve ev ürünlerinde hızlı teslimat.',

    'topbar.promo': '1.000 EGP üzeri siparişlerde ücretsiz kargo — WELCOME10 koduyla anında %10 İNDİRİM!',
    'topbar.authentic': '%100 Orijinal Ürünler',
    'topbar.fastDelivery': 'Hızlı Kargo İmkanı',
    'topbar.sellWithUs': 'Mağazanızı Açın',

    'nav.searchPlaceholder': 'Ürün, marka veya kategori ara...',
    'nav.searchAria': 'Ürün ara',
    'nav.home': 'Ana Sayfa',
    'nav.products': 'Ürünler',
    'nav.notifications': 'Bildirimler',
    'nav.wishlist': 'Favorilerim',
    'nav.cart': 'Sepetim',
    'nav.login': 'Giriş Yap',
    'nav.register': 'Kayıt Ol',
    'nav.profile': 'Hesabım',
    'nav.orders': 'Siparişlerim',
    'nav.vendorDashboard': 'Satıcı Paneli',
    'nav.adminDashboard': 'Yönetim Paneli',
    'nav.logout': 'Çıkış Yap',
    'nav.theme': 'Görünüm',
    'nav.lightMode': 'Açık Mod',
    'nav.darkMode': 'Koyu Mod',
    'nav.language': 'Dil',
    'nav.menu': 'Menü',
    'nav.plusBadge': 'PLUS',
    'nav.proBadge': 'PRO',

    'hero.badge': '#1 Güvenilir ve Onaylı Pazaryeri',
    'hero.title': 'Onaylı Mağazalardan Yeni Nesil Alışveriş Deneyimi',
    'hero.subtitle': 'Elektronik, moda, kitap ve yaşam ürünlerinde binlerce orijinal seçeneği alıcı koruması ve hızlı teslimatla keşfedin.',
    'hero.ctaPrimary': 'Ürünleri Keşfet',
    'hero.ctaSecondary': 'Satıcı Ol',
    'hero.statProducts': 'Orijinal Ürün',
    'hero.statCustomers': 'Mutlu Müşteri',
    'hero.statRating': 'Müşteri Memnuniyeti',
    'hero.floatingVerified': '%100 Onaylı Satıcılar',
    'hero.floatingDiscount': "%40'a Varan İndirimler",

    'features.shipping.title': 'Süper Hızlı Teslimat',
    'features.shipping.desc': 'Siparişinizi kapınıza kadar anlık olarak takip edin',
    'features.secure.title': '%100 Güvenli Ödeme',
    'features.secure.desc': 'Kapıda ödeme, banka/kredi kartları ve dijital cüzdan desteği',
    'features.returns.title': 'Kolay İade Garantisi',
    'features.returns.desc': '14 gün içinde koşulsuz ve zahmetsiz iade imkanı',
    'features.support.title': '7/24 Canlı Destek',
    'features.support.desc': 'Yapay zeka asistanı ve müşteri hizmetleri her an yanınızda',

    'section.categories': 'Kategorilere Göre Alışveriş',
    'section.categoriesSub': 'Tarzınıza uygun özenle seçilmiş koleksiyonları keşfedin',
    'section.featured': 'Öne Çıkan Ürünler',
    'section.featuredSub': 'Bu haftanın en yüksek puanlı ve en çok satan ürünleri',
    'section.newArrivals': 'Yeni Gelenler',
    'section.newArrivalsSub': 'Onaylı iş ortaklarımızdan en yeni ürünler',
    'section.viewAll': 'Tümünü Gör',

    'promo.badge': 'Sınırlı Süreli Özel Fırsat',
    'promo.title': 'İlk Siparişinizde Ekstra %10 İndirim Kazanın!',
    'promo.desc': 'Aşağıdaki kupon kodunu kopyalayın ve sepette uygulayarak tüm kategorilerde anında indirim kazanın.',
    'promo.copyBtn': 'Kodu Kopyala: WELCOME10',
    'promo.copied': 'WELCOME10 kupon kodu kopyalandı!',

    'product.addToCart': 'Sepete Ekle',
    'product.outOfStock': 'Stokta Yok',
    'product.inStock': 'Stokta Var',
    'product.addedToCart': 'Sepete eklendi',
    'product.loginFirst': 'Sepete eklemek için lütfen giriş yapın',
    'product.reviews': 'değerlendirme',
    'product.featured': 'Öne Çıkan',
    'product.new': 'Yeni',

    'catalog.title': 'Tüm Ürünler',
    'catalog.subtitle': 'Onaylı ve orijinal ürün kataloğumuzun tamamını inceleyin',
    'catalog.filters': 'Filtreler',
    'catalog.categories': 'Kategoriler',
    'catalog.allCategories': 'Tüm Kategoriler',
    'catalog.priceRange': 'Fiyat Aralığı',
    'catalog.minPrice': 'Min',
    'catalog.maxPrice': 'Maks',
    'catalog.applyFilter': 'Uygula',
    'catalog.resetFilters': 'Filtreleri Sıfırla',
    'catalog.sortBy': 'Sırala:',
    'catalog.sortNewest': 'En Yeniler',
    'catalog.sortPriceAsc': 'Fiyat: Düşükten Yükseğe',
    'catalog.sortPriceDesc': 'Fiyat: Yüksekten Düşüğe',
    'catalog.sortRating': 'En Yüksek Puanlılar',
    'catalog.sortBestselling': 'En Çok Satanlar',
    'catalog.noProducts': 'Eşleşen ürün bulunamadı',
    'catalog.noProductsDesc': 'Arama kelimelerinizi değiştirmeyi veya filtreleri sıfırlamayı deneyin.',
    'catalog.showingResults': 'Sonuçlar gösteriliyor',

    'cart.title': 'Alışveriş Sepeti',
    'cart.empty': 'Sepetiniz şu anda boş',
    'cart.emptyDesc': 'Kataloğumuzu keşfedin ve favori ürünlerinizi sepetinize ekleyin.',
    'cart.startShopping': 'Alışverişe Başla',
    'cart.summary': 'Sipariş Özeti',
    'cart.subtotal': 'Ara Toplam',
    'cart.shipping': 'Kargo Ücreti',
    'cart.discount': 'İndirim',
    'cart.total': 'Genel Toplam',
    'cart.couponPlaceholder': 'Kupon kodu (örn. WELCOME10)',
    'cart.applyCoupon': 'Uygula',
    'cart.checkoutBtn': 'Alışverişi Tamamla',

    'auth.backToStore': 'Mağazaya Dön',
    'auth.loginTitle': 'Tekrar Hoş Geldiniz',
    'auth.loginSubtitle': 'Siparişlerinizi ve özel fırsatları takip etmek için giriş yapın',
    'auth.email': 'E-posta Adresi',
    'auth.password': 'Şifre',
    'auth.forgotPassword': 'Şifremi unuttum?',
    'auth.loginBtn': 'Giriş Yap',
    'auth.loggingIn': 'Giriş yapılıyor...',
    'auth.noAccount': 'Hesabınız yok mu?',
    'auth.createAccount': 'Yeni hesap oluştur',
    'auth.wantToSell': 'Satış yapmak ister misiniz?',
    'auth.registerStore': 'Mağazanızı açın',

    'footer.quickLinks': 'Hızlı Bağlantılar',
    'footer.customerService': 'Müşteri Hizmetleri',
    'footer.returnPolicy': 'İade ve Değişim',
    'footer.shippingPolicy': 'Kargo ve Teslimat',
    'footer.faq': 'Sıkça Sorulan Sorular',
    'footer.contact': 'İletişim',
    'footer.joinAsVendor': 'İş Ortağımız Olun',
    'footer.registerVendor': 'Satıcı Kaydı',
    'footer.terms': 'Kullanım Koşulları',
    'footer.privacy': 'Gizlilik Politikası',
    'footer.rights': 'Tüm hakları saklıdır',

    'cat.electronics': 'Elektronik',
    'cat.books': 'Kitap & Edebiyat',
    'cat.clothing': 'Moda & Giyim',
    'cat.home-kitchen': 'Ev & Mutfak',
    'cat.phones': 'Akıllı Telefonlar',
    'cat.headphones': 'Kulaklık & Ses',
    'cat.cameras': 'Kamera & Fotoğraf',
    'cat.accessories': 'Teknoloji Aksesuarları',

    'status.pending': 'Beklemede',
    'status.confirmed': 'Onaylandı',
    'status.processing': 'Hazırlanıyor',
    'status.shipped': 'Kargoya Verildi',
    'status.delivered': 'Teslim Edildi',
    'status.cancelled': 'İptal Edildi',
    'status.refunded': 'İade Edildi',
  },
};

const ARABIC_CATEGORY_SLUG_MAP: Record<string, string> = {
  'إلكترونيات': 'electronics',
  'كتب': 'books',
  'ملابس و أزياء': 'clothing',
  'ملابس': 'clothing',
  'المنزل والمطبخ': 'home-kitchen',
  'هواتف': 'phones',
  'سماعات': 'headphones',
  'كاميرات': 'cameras',
  'إكسسوارات': 'accessories',
};

interface LanguageContextType {
  lang: SupportedLang;
  langInfo: LanguageInfo;
  dir: 'rtl' | 'ltr';
  isRTL: boolean;
  setLang: (lang: SupportedLang) => void;
  t: (key: string, fallback?: string) => string;
  formatPrice: (price: number | string) => string;
  formatNumber: (num: number) => string;
  translateCategory: (name: string, slug?: string) => string;
  translateStatus: (status: string) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

function getInitialLang(): SupportedLang {
  try {
    const saved = localStorage.getItem('lang') as SupportedLang | null;
    if (saved && LANGUAGES.some(l => l.code === saved)) {
      return saved;
    }
  } catch {
    // ignore storage errors
  }
  return 'ar';
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<SupportedLang>(getInitialLang);

  const langInfo = useMemo(
    () => LANGUAGES.find(l => l.code === lang) || LANGUAGES[0]!,
    [lang]
  );

  useEffect(() => {
    document.documentElement.lang = langInfo.code;
    document.documentElement.dir = langInfo.dir;
    try {
      localStorage.setItem('lang', langInfo.code);
    } catch {
      // ignore storage errors
    }
  }, [langInfo]);

  const setLang = useCallback((nextLang: SupportedLang) => {
    setLangState(nextLang);
  }, []);

  const t = useCallback(
    (key: string, fallback?: string): string => {
      return (
        translations[lang]?.[key] ??
        translations.en?.[key] ??
        translations.ar?.[key] ??
        fallback ??
        key
      );
    },
    [lang]
  );

  const formatPrice = useCallback(
    (price: number | string): string => {
      const numeric = typeof price === 'string' ? parseFloat(price) : price;
      if (isNaN(numeric)) return `0 ${langInfo.currencySymbol}`;
      const formatted = numeric.toLocaleString(langInfo.locale, {
        minimumFractionDigits: numeric % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2,
      });
      return langInfo.dir === 'rtl'
        ? `${formatted} ${langInfo.currencySymbol}`
        : `${formatted} ${langInfo.currencySymbol}`;
    },
    [langInfo]
  );

  const formatNumber = useCallback(
    (num: number): string => {
      return num.toLocaleString(langInfo.locale);
    },
    [langInfo]
  );

  const translateCategory = useCallback(
    (name: string, slug?: string): string => {
      if (lang === 'ar') return name;
      const key = slug || ARABIC_CATEGORY_SLUG_MAP[name.trim()];
      if (key && translations[lang]?.[`cat.${key}`]) {
        return translations[lang][`cat.${key}`]!;
      }
      return name;
    },
    [lang]
  );

  const translateStatus = useCallback(
    (status: string): string => {
      return t(`status.${status}`, status);
    },
    [t]
  );

  const value = useMemo(
    () => ({
      lang,
      langInfo,
      dir: langInfo.dir,
      isRTL: langInfo.dir === 'rtl',
      setLang,
      t,
      formatPrice,
      formatNumber,
      translateCategory,
      translateStatus,
    }),
    [lang, langInfo, setLang, t, formatPrice, formatNumber, translateCategory, translateStatus]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextType {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
}
