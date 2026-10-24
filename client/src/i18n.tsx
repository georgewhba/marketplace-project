import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';

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
type MultiLangEntry = Record<Exclude<SupportedLang, 'ar'>, string>;

const translations: Record<SupportedLang, TranslationDict> = {
  ar: {
    'site.name': 'سوق مصر',
    'site.tagline': 'منصة التجارة الإلكترونية الأولى في مصر',
    'site.description': 'منصة التجارة الإلكترونية الأولى في مصر. تسوّق من أفضل البائعين المعتمدين بضمان الجودة والتوصيل السريع.',

    'topbar.promo': 'شحن مجاني للطلبات فوق 1000 ج.م — استخدم كود WELCOME10 لخصم 10% فوري!',
    'topbar.authentic': 'منتجات أصلية 100%',
    'topbar.fastDelivery': 'توصيل سريع لجميع المحافظات',
    'topbar.sellWithUs': 'بع معنا على المنصة',

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
    'nav.lightMode': 'تفعيل الوضع الفاتح',
    'nav.darkMode': 'تفعيل الوضع الداكن',
    'nav.language': 'اللغة',
    'nav.menu': 'القائمة',
    'nav.plusBadge': 'بلس',
    'nav.proBadge': 'برو',

    'hero.badge': 'منصة تسوّق معتمدة وموثوقة',
    'hero.title': 'أفضل المنتجات من بائعين موثوقين',
    'hero.subtitle': 'تسوّق إلكترونيات، كتب، ملابس ومستلزمات المنزل من أفضل البائعين المعتمدين في مصر مع ضمان الجودة والتوصيل السريع.',
    'hero.ctaPrimary': 'تصفّح المنتجات',
    'hero.ctaSecondary': 'سجّل متجرك معنا',
    'hero.statProducts': 'منتج أصلي ومضمون',
    'hero.statCustomers': 'عميل يثق بنا',
    'hero.statRating': 'تقييم تجربة الشراء',
    'hero.floatingVerified': 'بائعون معتمدون وموثقون',
    'hero.floatingDiscount': 'خصومات تصل إلى 40%',

    'features.shipping.title': 'توصيل سريع وموثوق',
    'features.shipping.desc': 'تتبع شحنتك لحظة بلحظة حتى باب منزلك في جميع المحافظات',
    'features.secure.title': 'دفع آمن 100%',
    'features.secure.desc': 'دفع عند الاستلام أو عبر البطاقات البنكية والمحافظ الإلكترونية',
    'features.returns.title': 'استرجاع مضمون خلال 14 يوماً',
    'features.returns.desc': 'سياسة استبدال واسترجاع مرنة وسهلة لحماية حقوقك بالكامل',
    'features.support.title': 'دعم عملاء متواصل',
    'features.support.desc': 'فريق خدمة عملاء جاهز لمساعدتك والإجابة عن استفساراتك',

    'section.categories': 'تسوّق حسب القسم',
    'section.categoriesSub': 'اختر القسم المفضل لديك واستكشف أحدث العروض',
    'section.featured': 'المنتجات المميزة',
    'section.featuredSub': 'أفضل المنتجات المختارة بعناية والأعلى تقييماً',
    'section.newArrivals': 'وصل حديثاً',
    'section.newArrivalsSub': 'أحدث الإضافات الحصرية من المتاجر المعتمدة',
    'section.viewAll': 'عرض الكل',

    'promo.badge': 'هدية ترحيبية خاصة',
    'promo.title': 'خصم إضافي 10% على طلبك الأول!',
    'promo.desc': 'انسخ كود الخصم واستخدمه عند إتمام الطلب للاستفادة من العرض فوراً على جميع الأقسام.',
    'promo.copyBtn': 'انسخ الكود: WELCOME10',
    'promo.copied': 'تم نسخ كود الخصم WELCOME10 بنجاح!',

    'product.addToCart': 'أضف للسلة',
    'product.outOfStock': 'نفذ من المخزون',
    'product.inStock': 'متوفر في المخزون',
    'product.addedToCart': 'تمت الإضافة للسلة',
    'product.loginFirst': 'سجّل الدخول أولاً',
    'product.reviews': 'تقييم',
    'product.featured': 'مميز',
    'product.new': 'جديد',

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
    'catalog.sortNewest': 'الأحدث',
    'catalog.sortPriceAsc': 'السعر: من الأقل للأعلى',
    'catalog.sortPriceDesc': 'السعر: من الأعلى للأقل',
    'catalog.sortRating': 'الأعلى تقييماً',
    'catalog.sortBestselling': 'الأكثر مبيعاً',
    'catalog.noProducts': 'لا توجد منتجات مطابقة لبحثك',
    'catalog.noProductsDesc': 'جرّب تغيير كلمات البحث أو إزالة بعض الفلاتر لعرض نتائج أكثر.',
    'catalog.showingResults': 'عرض النتائج',

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

    'auth.backToStore': 'العودة للمتجر',
    'auth.loginTitle': 'تسجيل الدخول',
    'auth.loginSubtitle': 'مرحباً بعودتك! سجّل الدخول للمتابعة',
    'auth.email': 'البريد الإلكتروني',
    'auth.password': 'كلمة المرور',
    'auth.forgotPassword': 'نسيت كلمة المرور؟',
    'auth.loginBtn': 'تسجيل الدخول',
    'auth.loggingIn': 'جاري تسجيل الدخول...',
    'auth.noAccount': 'ليس لديك حساب؟',
    'auth.createAccount': 'إنشاء حساب جديد',
    'auth.wantToSell': 'تريد البيع معنا؟',
    'auth.registerStore': 'سجّل متجرك',

    'footer.quickLinks': 'روابط سريعة',
    'footer.customerService': 'خدمة العملاء',
    'footer.returnPolicy': 'سياسة الإرجاع',
    'footer.shippingPolicy': 'الشحن والتوصيل',
    'footer.faq': 'الأسئلة الشائعة',
    'footer.contact': 'تواصل معنا',
    'footer.joinAsVendor': 'انضم كبائع',
    'footer.registerVendor': 'سجّل متجرك',
    'footer.terms': 'شروط الاستخدام',
    'footer.privacy': 'سياسة الخصوصية',
    'footer.rights': 'جميع الحقوق محفوظة',

    'cat.electronics': 'إلكترونيات',
    'cat.books': 'كتب',
    'cat.clothing': 'ملابس',
    'cat.home': 'منزل',
    'cat.home-kitchen': 'المنزل والمطبخ',
    'cat.headphones': 'سماعات',
    'cat.laptops': 'لابتوب',
    'cat.phones': 'موبايلات',
    'cat.cameras': 'كاميرات',
    'cat.novels': 'روايات',
    'cat.tech-books': 'كتب تقنية',
    'cat.self-help': 'تطوير ذات',
    'cat.history': 'تاريخ',
    'cat.men': 'رجالي',
    'cat.women': 'نسائي',
    'cat.kids': 'أطفال',
    'cat.kitchen': 'أدوات مطبخ',
    'cat.decor': 'ديكور',
    'cat.accessories': 'إكسسوارات',

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
    'site.description': 'Shop from top verified sellers in Egypt. Electronics, fashion, books, and home essentials with guaranteed quality and fast delivery.',

    'topbar.promo': 'Free shipping on orders over 1,000 EGP — Use code WELCOME10 for 10% OFF!',
    'topbar.authentic': '100% Authentic Products',
    'topbar.fastDelivery': 'Fast Nationwide Delivery',
    'topbar.sellWithUs': 'Sell on Souq Misr',

    'nav.searchPlaceholder': 'Search products, brands, or categories...',
    'nav.searchAria': 'Search products',
    'nav.home': 'Home',
    'nav.products': 'Products',
    'nav.notifications': 'Notifications',
    'nav.wishlist': 'Wishlist',
    'nav.cart': 'Cart',
    'nav.login': 'Sign In',
    'nav.register': 'Sign Up',
    'nav.profile': 'My Profile',
    'nav.orders': 'My Orders',
    'nav.vendorDashboard': 'Seller Dashboard',
    'nav.adminDashboard': 'Admin Console',
    'nav.logout': 'Sign Out',
    'nav.theme': 'Appearance',
    'nav.lightMode': 'Switch to Light Mode',
    'nav.darkMode': 'Switch to Dark Mode',
    'nav.language': 'Language',
    'nav.menu': 'Menu',
    'nav.plusBadge': 'PLUS',
    'nav.proBadge': 'PRO',

    'hero.badge': 'Verified Multi-Vendor Marketplace',
    'hero.title': 'Top Products from Trusted Sellers',
    'hero.subtitle': 'Shop electronics, books, fashion, and home essentials from top verified sellers in Egypt with quality guarantee and fast delivery.',
    'hero.ctaPrimary': 'Browse Products',
    'hero.ctaSecondary': 'Become a Seller',
    'hero.statProducts': 'Authentic Products',
    'hero.statCustomers': 'Happy Shoppers',
    'hero.statRating': 'Customer Rating',
    'hero.floatingVerified': '100% Verified Merchants',
    'hero.floatingDiscount': 'Up to 40% Exclusive Deals',

    'features.shipping.title': 'Fast & Reliable Delivery',
    'features.shipping.desc': 'Real-time shipment tracking straight to your doorstep nationwide',
    'features.secure.title': '100% Secure Payments',
    'features.secure.desc': 'Cash on delivery, credit/debit cards, and mobile wallets supported',
    'features.returns.title': '14-Day Easy Returns',
    'features.returns.desc': 'Flexible return and exchange policy with full buyer protection',
    'features.support.title': 'Dedicated Customer Care',
    'features.support.desc': 'Our support team is always ready to help with your orders',

    'section.categories': 'Shop by Category',
    'section.categoriesSub': 'Browse curated collections tailored to your lifestyle',
    'section.featured': 'Featured Products',
    'section.featuredSub': 'Handpicked top-rated and most popular items',
    'section.newArrivals': 'New Arrivals',
    'section.newArrivalsSub': 'The latest additions from our verified partner stores',
    'section.viewAll': 'View All',

    'promo.badge': 'Special Welcome Offer',
    'promo.title': 'Get 10% OFF Your First Order!',
    'promo.desc': 'Copy the promo code and apply it at checkout for instant savings across all categories.',
    'promo.copyBtn': 'Copy Code: WELCOME10',
    'promo.copied': 'Promo code WELCOME10 copied to clipboard!',

    'product.addToCart': 'Add to Cart',
    'product.outOfStock': 'Out of Stock',
    'product.inStock': 'In Stock',
    'product.addedToCart': 'Added to cart',
    'product.loginFirst': 'Please sign in first',
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
    'catalog.sortNewest': 'Newest',
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
    'auth.loginTitle': 'Sign In',
    'auth.loginSubtitle': 'Welcome back! Sign in to access your account',
    'auth.email': 'Email Address',
    'auth.password': 'Password',
    'auth.forgotPassword': 'Forgot password?',
    'auth.loginBtn': 'Sign In',
    'auth.loggingIn': 'Signing in...',
    'auth.noAccount': "Don't have an account?",
    'auth.createAccount': 'Create an account',
    'auth.wantToSell': 'Want to sell with us?',
    'auth.registerStore': 'Register your store',

    'footer.quickLinks': 'Quick Links',
    'footer.customerService': 'Customer Care',
    'footer.returnPolicy': 'Return Policy',
    'footer.shippingPolicy': 'Shipping & Delivery',
    'footer.faq': 'FAQ',
    'footer.contact': 'Contact Us',
    'footer.joinAsVendor': 'Join as a Seller',
    'footer.registerVendor': 'Register Your Store',
    'footer.terms': 'Terms of Use',
    'footer.privacy': 'Privacy Policy',
    'footer.rights': 'All rights reserved',

    'cat.electronics': 'Electronics',
    'cat.books': 'Books',
    'cat.clothing': 'Fashion & Clothing',
    'cat.home': 'Home & Living',
    'cat.home-kitchen': 'Home & Kitchen',
    'cat.headphones': 'Headphones & Audio',
    'cat.laptops': 'Laptops',
    'cat.phones': 'Smartphones',
    'cat.cameras': 'Cameras',
    'cat.novels': 'Novels',
    'cat.tech-books': 'Tech Books',
    'cat.self-help': 'Self-Development',
    'cat.history': 'History',
    'cat.men': "Men's Fashion",
    'cat.women': "Women's Fashion",
    'cat.kids': 'Kids',
    'cat.kitchen': 'Kitchen Essentials',
    'cat.decor': 'Home Decor',
    'cat.accessories': 'Accessories',

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
    'site.tagline': 'Plateforme E-Commerce Multi-Vendeurs',
    'site.description': 'Achetez auprès des meilleurs vendeurs vérifiés. Électronique, mode, livres et maison avec garantie qualité et livraison rapide.',

    'topbar.promo': 'Livraison gratuite dès 1 000 EGP — Code WELCOME10 pour -10% immédiat !',
    'topbar.authentic': 'Produits 100% Authentiques',
    'topbar.fastDelivery': 'Livraison Rapide',
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

    'hero.badge': 'Marketplace Multi-Vendeurs Certifiée',
    'hero.title': 'Les Meilleurs Produits de Vendeurs de Confiance',
    'hero.subtitle': 'Achetez électronique, livres, mode et articles de maison auprès des meilleurs vendeurs vérifiés avec garantie qualité et livraison rapide.',
    'hero.ctaPrimary': 'Parcourir les Produits',
    'hero.ctaSecondary': 'Devenir Vendeur',
    'hero.statProducts': 'Produits Authentiques',
    'hero.statCustomers': 'Clients Satisfaits',
    'hero.statRating': 'Note Moyenne',
    'hero.floatingVerified': 'Vendeurs 100% Certifiés',
    'hero.floatingDiscount': "Jusqu'à -40% d'Offres",

    'features.shipping.title': 'Livraison Rapide & Fiable',
    'features.shipping.desc': 'Suivi en temps réel de votre colis jusqu’à votre porte',
    'features.secure.title': 'Paiement 100% Sécurisé',
    'features.secure.desc': 'Paiement à la livraison, cartes bancaires et portefeuilles mobiles',
    'features.returns.title': 'Retours sous 14 Jours',
    'features.returns.desc': 'Politique de retour et remboursement simple et garantie',
    'features.support.title': 'Service Client Dédié',
    'features.support.desc': 'Notre équipe est disponible pour vous accompagner à tout moment',

    'section.categories': 'Acheter par Catégorie',
    'section.categoriesSub': 'Parcourez nos sélections adaptées à vos envies',
    'section.featured': 'Produits en Vedette',
    'section.featuredSub': 'Les produits les mieux notés et les plus populaires',
    'section.newArrivals': 'Nouveautés',
    'section.newArrivalsSub': 'Les derniers arrivages de nos boutiques partenaires',
    'section.viewAll': 'Tout Voir',

    'promo.badge': 'Offre de Bienvenue',
    'promo.title': '-10% Supplémentaires sur Votre 1ère Commande !',
    'promo.desc': 'Copiez le code promo et appliquez-le dans votre panier pour économiser immédiatement.',
    'promo.copyBtn': 'Copier : WELCOME10',
    'promo.copied': 'Code promo WELCOME10 copié !',

    'product.addToCart': 'Ajouter au Panier',
    'product.outOfStock': 'Rupture de Stock',
    'product.inStock': 'En Stock',
    'product.addedToCart': 'Ajouté au panier',
    'product.loginFirst': 'Connectez-vous d’abord',
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
    'auth.loginTitle': 'Connexion',
    'auth.loginSubtitle': 'Bon retour ! Connectez-vous pour continuer',
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
    'footer.joinAsVendor': 'Devenir Vendeur',
    'footer.registerVendor': 'Ouvrir Votre Boutique',
    'footer.terms': "Conditions d'Utilisation",
    'footer.privacy': 'Confidentialité',
    'footer.rights': 'Tous droits réservés',

    'cat.electronics': 'Électronique',
    'cat.books': 'Livres',
    'cat.clothing': 'Mode & Vêtements',
    'cat.home': 'Maison & Déco',
    'cat.home-kitchen': 'Maison & Cuisine',
    'cat.headphones': 'Casques & Audio',
    'cat.laptops': 'Ordinateurs Portables',
    'cat.phones': 'Smartphones',
    'cat.cameras': 'Appareils Photo',
    'cat.novels': 'Romans',
    'cat.tech-books': 'Livres Tech',
    'cat.self-help': 'Développement Personnel',
    'cat.history': 'Histoire',
    'cat.men': 'Mode Homme',
    'cat.women': 'Mode Femme',
    'cat.kids': 'Enfants',
    'cat.kitchen': 'Cuisine',
    'cat.decor': 'Décoration',
    'cat.accessories': 'Accessoires',

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
    'site.description': 'Compra de los mejores vendedores verificados. Electrónica, moda, libros y hogar con garantía de calidad y envío rápido.',

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

    'hero.badge': 'Marketplace Multi-Vendedor Verificado',
    'hero.title': 'Los Mejores Productos de Vendedores de Confianza',
    'hero.subtitle': 'Compra electrónica, libros, moda y artículos para el hogar de los mejores vendedores verificados con garantía de calidad y entrega rápida.',
    'hero.ctaPrimary': 'Explorar Productos',
    'hero.ctaSecondary': 'Abrir mi Tienda',
    'hero.statProducts': 'Productos Originales',
    'hero.statCustomers': 'Clientes Felices',
    'hero.statRating': 'Valoración Media',
    'hero.floatingVerified': 'Vendedores Verificados',
    'hero.floatingDiscount': 'Hasta 40% de Descuento',

    'features.shipping.title': 'Envío Rápido y Seguro',
    'features.shipping.desc': 'Seguimiento en tiempo real hasta la puerta de tu casa',
    'features.secure.title': 'Pago 100% Seguro',
    'features.secure.desc': 'Pago contra reembolso, tarjetas bancarias y billeteras digitales',
    'features.returns.title': 'Devoluciones en 14 Días',
    'features.returns.desc': 'Política flexible de cambio y devolución con garantía total',
    'features.support.title': 'Atención al Cliente',
    'features.support.desc': 'Nuestro equipo de soporte está listo para ayudarte siempre',

    'section.categories': 'Comprar por Categoría',
    'section.categoriesSub': 'Explora nuestras colecciones seleccionadas para ti',
    'section.featured': 'Productos Destacados',
    'section.featuredSub': 'Los artículos mejor valorados y más vendidos',
    'section.newArrivals': 'Nuevos Lanzamientos',
    'section.newArrivalsSub': 'Las últimas novedades de nuestras tiendas asociadas',
    'section.viewAll': 'Ver Todo',

    'promo.badge': 'Oferta Especial de Bienvenida',
    'promo.title': '¡Obtén un 10% de Descuento en tu Primer Pedido!',
    'promo.desc': 'Copia el código promocional y aplícalo al finalizar tu compra para ahorrar al instante.',
    'promo.copyBtn': 'Copiar: WELCOME10',
    'promo.copied': '¡Código WELCOME10 copiado!',

    'product.addToCart': 'Añadir al Carrito',
    'product.outOfStock': 'Agotado',
    'product.inStock': 'En Stock',
    'product.addedToCart': 'Añadido al carrito',
    'product.loginFirst': 'Inicia sesión primero',
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
    'auth.loginTitle': 'Iniciar Sesión',
    'auth.loginSubtitle': '¡Bienvenido de nuevo! Inicia sesión para continuar',
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
    'cat.home': 'Hogar y Cocina',
    'cat.home-kitchen': 'Hogar y Cocina',
    'cat.headphones': 'Auriculares y Audio',
    'cat.laptops': 'Portátiles',
    'cat.phones': 'Smartphones',
    'cat.cameras': 'Cámaras',
    'cat.novels': 'Novelas',
    'cat.tech-books': 'Libros de Tecnología',
    'cat.self-help': 'Desarrollo Personal',
    'cat.history': 'Historia',
    'cat.men': 'Moda Hombre',
    'cat.women': 'Moda Mujer',
    'cat.kids': 'Niños',
    'cat.kitchen': 'Cocina',
    'cat.decor': 'Decoración',
    'cat.accessories': 'Accesorios',

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
    'site.tagline': 'Führende Multi-Vendor E-Commerce Plattform',
    'site.description': 'Kaufen Sie bei geprüften Top-Händlern. Elektronik, Mode, Bücher und Wohnen mit Qualitätsgarantie und schnellem Versand.',

    'topbar.promo': 'Kostenloser Versand ab 1.000 EGP — Code WELCOME10 für 10% Sofortrabatt!',
    'topbar.authentic': '100% Originalprodukte',
    'topbar.fastDelivery': 'Schnelle Lieferung',
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

    'hero.badge': 'Geprüfter & Sicherer Online-Marktplatz',
    'hero.title': 'Top-Produkte von Vertrauenswürdigen Händlern',
    'hero.subtitle': 'Entdecken Sie Elektronik, Bücher, Mode und Wohnaccessoires von verifizierten Händlern mit Qualitätsgarantie und schnellem Versand.',
    'hero.ctaPrimary': 'Produkte Entdecken',
    'hero.ctaSecondary': 'Händler Werden',
    'hero.statProducts': 'Originalprodukte',
    'hero.statCustomers': 'Zufriedene Kunden',
    'hero.statRating': 'Kundenbewertung',
    'hero.floatingVerified': '100% Geprüfte Händler',
    'hero.floatingDiscount': 'Bis zu 40% Rabatt',

    'features.shipping.title': 'Schneller & Zuverlässiger Versand',
    'features.shipping.desc': 'Sendungsverfolgung in Echtzeit direkt bis an Ihre Haustür',
    'features.secure.title': '100% Sichere Zahlung',
    'features.secure.desc': 'Nachnahme, Kredit-/Debitkarten und Mobile Wallets',
    'features.returns.title': '14 Tage Rückgaberecht',
    'features.returns.desc': 'Unkomplizierte Rückgabe- und Umtauschgarantie',
    'features.support.title': 'Kundenservice',
    'features.support.desc': 'Unser Support-Team steht Ihnen jederzeit zur Verfügung',

    'section.categories': 'Nach Kategorie Einkaufen',
    'section.categoriesSub': 'Entdecken Sie kuratierte Kollektionen für jeden Anspruch',
    'section.featured': 'Empfohlene Produkte',
    'section.featuredSub': 'Die bestbewerteten und beliebtesten Produkte',
    'section.newArrivals': 'Neu Eingetroffen',
    'section.newArrivalsSub': 'Die neuesten Produkte unserer zertifizierten Partner',
    'section.viewAll': 'Alle Anzeigen',

    'promo.badge': 'Willkommensangebot',
    'promo.title': '10% Rabatt auf Ihre Erste Bestellung!',
    'promo.desc': 'Kopieren Sie den Gutscheincode und lösen Sie ihn im Warenkorb ein.',
    'promo.copyBtn': 'Code Kopieren: WELCOME10',
    'promo.copied': 'Gutscheincode WELCOME10 kopiert!',

    'product.addToCart': 'In den Warenkorb',
    'product.outOfStock': 'Ausverkauft',
    'product.inStock': 'Auf Lager',
    'product.addedToCart': 'Zum Warenkorb hinzugefügt',
    'product.loginFirst': 'Bitte zuerst anmelden',
    'product.reviews': 'Bewertungen',
    'product.featured': 'Empfohlen',
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
    'catalog.sortNewest': 'Neueste',
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
    'auth.loginTitle': 'Anmelden',
    'auth.loginSubtitle': 'Willkommen zurück! Melden Sie sich an, um fortzufahren',
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
    'cat.home': 'Haus & Wohnen',
    'cat.home-kitchen': 'Haus & Küche',
    'cat.headphones': 'Kopfhörer & Audio',
    'cat.laptops': 'Laptops',
    'cat.phones': 'Smartphones',
    'cat.cameras': 'Kameras',
    'cat.novels': 'Romane',
    'cat.tech-books': 'Tech-Bücher',
    'cat.self-help': 'Persönlichkeitsentwicklung',
    'cat.history': 'Geschichte',
    'cat.men': 'Herrenmode',
    'cat.women': 'Damenmode',
    'cat.kids': 'Kinder',
    'cat.kitchen': 'Küche',
    'cat.decor': 'Dekoration',
    'cat.accessories': 'Zubehör',

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
    'site.description': 'Onaylı satıcılardan güvenle alışveriş yapın. Elektronik, moda, kitap ve ev ürünlerinde kalite garantisi ve hızlı teslimat.',

    'topbar.promo': '1.000 EGP üzeri siparişlerde ücretsiz kargo — WELCOME10 koduyla anında %10 İNDİRİM!',
    'topbar.authentic': '%100 Orijinal Ürünler',
    'topbar.fastDelivery': 'Hızlı Teslimat',
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

    'hero.badge': 'Güvenilir ve Onaylı Pazaryeri',
    'hero.title': 'Güvenilir Satıcılardan En İyi Ürünler',
    'hero.subtitle': 'Elektronik, kitap, giyim ve ev yaşam ürünlerini kalite garantisi ve hızlı kargo avantajıyla keşfedin.',
    'hero.ctaPrimary': 'Ürünleri Keşfet',
    'hero.ctaSecondary': 'Satıcı Ol',
    'hero.statProducts': 'Orijinal Ürün',
    'hero.statCustomers': 'Mutlu Müşteri',
    'hero.statRating': 'Müşteri Puanı',
    'hero.floatingVerified': '%100 Onaylı Satıcılar',
    'hero.floatingDiscount': "%40'a Varan İndirimler",

    'features.shipping.title': 'Hızlı ve Güvenilir Kargo',
    'features.shipping.desc': 'Siparişinizi kapınıza kadar anlık olarak takip edin',
    'features.secure.title': '%100 Güvenli Ödeme',
    'features.secure.desc': 'Kapıda ödeme, banka/kredi kartları ve dijital cüzdan desteği',
    'features.returns.title': '14 Gün Kolay İade',
    'features.returns.desc': 'Koşulsuz ve zahmetsiz iade ve değişim garantisi',
    'features.support.title': 'Müşteri Desteği',
    'features.support.desc': 'Destek ekibimiz her zaman yardıma hazır',

    'section.categories': 'Kategorilere Göre Alışveriş',
    'section.categoriesSub': 'Tarzınıza uygun özenle seçilmiş koleksiyonları keşfedin',
    'section.featured': 'Öne Çıkan Ürünler',
    'section.featuredSub': 'En yüksek puanlı ve en çok tercih edilen ürünler',
    'section.newArrivals': 'Yeni Gelenler',
    'section.newArrivalsSub': 'Onaylı mağazalarımızdan en yeni ürünler',
    'section.viewAll': 'Tümünü Gör',

    'promo.badge': 'Özel Hoş Geldin Fırsatı',
    'promo.title': 'İlk Siparişinizde %10 İndirim!',
    'promo.desc': 'Kupon kodunu kopyalayın ve sepette uygulayarak anında indirim kazanın.',
    'promo.copyBtn': 'Kodu Kopyala: WELCOME10',
    'promo.copied': 'WELCOME10 kupon kodu kopyalandı!',

    'product.addToCart': 'Sepete Ekle',
    'product.outOfStock': 'Stokta Yok',
    'product.inStock': 'Stokta Var',
    'product.addedToCart': 'Sepete eklendi',
    'product.loginFirst': 'Lütfen önce giriş yapın',
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
    'auth.loginTitle': 'Giriş Yap',
    'auth.loginSubtitle': 'Tekrar hoş geldiniz! Devam etmek için giriş yapın',
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
    'footer.returnPolicy': 'İade Politikası',
    'footer.shippingPolicy': 'Kargo ve Teslimat',
    'footer.faq': 'Sıkça Sorulan Sorular',
    'footer.contact': 'İletişim',
    'footer.joinAsVendor': 'Satıcı Olun',
    'footer.registerVendor': 'Mağaza Kaydı',
    'footer.terms': 'Kullanım Koşulları',
    'footer.privacy': 'Gizlilik Politikası',
    'footer.rights': 'Tüm hakları saklıdır',

    'cat.electronics': 'Elektronik',
    'cat.books': 'Kitap & Edebiyat',
    'cat.clothing': 'Moda & Giyim',
    'cat.home': 'Ev & Yaşam',
    'cat.home-kitchen': 'Ev & Mutfak',
    'cat.headphones': 'Kulaklık & Ses',
    'cat.laptops': 'Dizüstü Bilgisayar',
    'cat.phones': 'Akıllı Telefonlar',
    'cat.cameras': 'Kamera & Fotoğraf',
    'cat.novels': 'Romanlar',
    'cat.tech-books': 'Teknoloji Kitapları',
    'cat.self-help': 'Kişisel Gelişim',
    'cat.history': 'Tarih',
    'cat.men': 'Erkek Giyim',
    'cat.women': 'Kadın Giyim',
    'cat.kids': 'Çocuk Giyim',
    'cat.kitchen': 'Mutfak Gereçleri',
    'cat.decor': 'Ev Dekorasyonu',
    'cat.accessories': 'Aksesuarlar',

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
  'منزل': 'home',
  'المنزل والمطبخ': 'home-kitchen',
  'سماعات': 'headphones',
  'لابتوب': 'laptops',
  'موبايلات': 'phones',
  'هواتف': 'phones',
  'كاميرات': 'cameras',
  'روايات': 'novels',
  'تقنية': 'tech-books',
  'تطوير ذات': 'self-help',
  'تاريخ': 'history',
  'رجالي': 'men',
  'نسائي': 'women',
  'أطفال': 'kids',
  'أدوات مطبخ': 'kitchen',
  'ديكور': 'decor',
  'إكسسوارات': 'accessories',
};

const PRODUCT_NAME_TRANSLATIONS: Record<string, MultiLangEntry> = {
  'سماعات سوني WH-1000XM5': {
    en: 'Sony WH-1000XM5 Wireless Noise-Canceling Headphones',
    fr: 'Casque sans fil Sony WH-1000XM5 à réduction de bruit',
    es: 'Auriculares inalámbricos Sony WH-1000XM5 con cancelación de ruido',
    de: 'Sony WH-1000XM5 Kabellose Noise-Cancelling-Kopfhörer',
    tr: 'Sony WH-1000XM5 Kablosuz Gürültü Engelleme Özellikli Kulaklık',
  },
  'سماعات سوني WF-1000XM5': {
    en: 'Sony WF-1000XM5 True Wireless Earbuds',
    fr: 'Écouteurs sans fil Sony WF-1000XM5',
    es: 'Auriculares internos inalámbricos Sony WF-1000XM5',
    de: 'Sony WF-1000XM5 Kabellose In-Ear-Kopfhörer',
    tr: 'Sony WF-1000XM5 Kablosuz Kulak İçi Kulaklık',
  },
  'سماعات سوني WH-CH720N': {
    en: 'Sony WH-CH720N Wireless Noise-Canceling Headphones',
    fr: 'Casque sans fil Sony WH-CH720N',
    es: 'Auriculares inalámbricos Sony WH-CH720N',
    de: 'Sony WH-CH720N Kabellose Kopfhörer',
    tr: 'Sony WH-CH720N Kablosuz Kulaklık',
  },
  'لابتوب سوني VAIO SX14': {
    en: 'Sony VAIO SX14 14" 4K Ultra-Light Laptop',
    fr: 'Ordinateur portable Sony VAIO SX14 14" 4K',
    es: 'Portátil ultraligero Sony VAIO SX14 14" 4K',
    de: 'Sony VAIO SX14 14" 4K Ultrabook',
    tr: 'Sony VAIO SX14 14" 4K Ultra Hafif Dizüstü Bilgisayar',
  },
  'لابتوب سوني VAIO FE 15': {
    en: 'Sony VAIO FE 15 15.6" Full HD Laptop',
    fr: 'Ordinateur portable Sony VAIO FE 15 15,6" Full HD',
    es: 'Portátil Sony VAIO FE 15 15.6" Full HD',
    de: 'Sony VAIO FE 15 15,6" Full-HD Laptop',
    tr: 'Sony VAIO FE 15 15.6" Full HD Dizüstü Bilgisayar',
  },
  'سوني Xperia 1 V': {
    en: 'Sony Xperia 1 V 5G Flagship Smartphone',
    fr: 'Smartphone Sony Xperia 1 V 5G',
    es: 'Smartphone Sony Xperia 1 V 5G',
    de: 'Sony Xperia 1 V 5G Smartphone',
    tr: 'Sony Xperia 1 V 5G Akıllı Telefon',
  },
  'سوني Xperia 10 V': {
    en: 'Sony Xperia 10 V Smartphone',
    fr: 'Smartphone Sony Xperia 10 V',
    es: 'Smartphone Sony Xperia 10 V',
    de: 'Sony Xperia 10 V Smartphone',
    tr: 'Sony Xperia 10 V Akıllı Telefon',
  },
  'كاميرا سوني Alpha A7 IV': {
    en: 'Sony Alpha A7 IV Full-Frame Mirrorless Camera',
    fr: 'Appareil photo hybride Sony Alpha A7 IV Plein Format',
    es: 'Cámara sin espejo Sony Alpha A7 IV Full-Frame',
    de: 'Sony Alpha A7 IV Vollformat-Systemkamera',
    tr: 'Sony Alpha A7 IV Full-Frame Aynasız Fotoğraf Makinesi',
  },
  'كاميرا سوني ZV-E10 II': {
    en: 'Sony ZV-E10 II Mirrorless Vlog Camera',
    fr: 'Appareil photo Vlog Sony ZV-E10 II',
    es: 'Cámara Vlog sin espejo Sony ZV-E10 II',
    de: 'Sony ZV-E10 II Vlogging-Systemkamera',
    tr: 'Sony ZV-E10 II Aynasız Vlog Kamerası',
  },
  'عدسة سوني FE 50mm f/1.4 GM': {
    en: 'Sony FE 50mm f/1.4 GM Prime Lens',
    fr: 'Objectif Sony FE 50mm f/1.4 GM',
    es: 'Objetivo Sony FE 50mm f/1.4 GM',
    de: 'Sony FE 50mm f/1.4 GM Objektiv',
    tr: 'Sony FE 50mm f/1.4 GM Lens',
  },
  'سماعات سوني LinkBuds S': {
    en: 'Sony LinkBuds S Ultra-Light Wireless Earbuds',
    fr: 'Écouteurs sans fil Sony LinkBuds S',
    es: 'Auriculares inalámbricos Sony LinkBuds S',
    de: 'Sony LinkBuds S Kabellose In-Ear-Kopfhörer',
    tr: 'Sony LinkBuds S Kablosuz Kulaklık',
  },
  'كاميرا سوني RX100 VII': {
    en: 'Sony RX100 VII Premium Compact Camera',
    fr: 'Appareil photo compact expert Sony RX100 VII',
    es: 'Cámara compacta premium Sony RX100 VII',
    de: 'Sony RX100 VII Premium-Kompaktkamera',
    tr: 'Sony RX100 VII Premium Kompakt Kamera',
  },
  'سبيكر سوني SRS-XB100': {
    en: 'Sony SRS-XB100 Portable Bluetooth Speaker',
    fr: 'Enceinte Bluetooth portable Sony SRS-XB100',
    es: 'Altavoz Bluetooth portátil Sony SRS-XB100',
    de: 'Sony SRS-XB100 Tragbarer Bluetooth-Lautsprecher',
    tr: 'Sony SRS-XB100 Taşınabilir Bluetooth Hoparlör',
  },
  'سوني Xperia 5 V': {
    en: 'Sony Xperia 5 V Compact Flagship Smartphone',
    fr: 'Smartphone compact Sony Xperia 5 V',
    es: 'Smartphone compacto Sony Xperia 5 V',
    de: 'Sony Xperia 5 V Kompakt-Smartphone',
    tr: 'Sony Xperia 5 V Kompakt Akıllı Telefon',
  },
  'حقيبة لابتوب سوني': {
    en: 'Sony 15" Water-Resistant Laptop Bag',
    fr: 'Sacoche ordinateur portable Sony 15" imperméable',
    es: 'Maletín impermeable para portátil Sony 15"',
    de: 'Sony 15" Wasserabweisende Laptoptasche',
    tr: 'Sony 15" Suya Dayanıklı Laptop Çantası',
  },
  'عمارة يعقوبيان — علاء الأسواني': {
    en: 'The Yacoubian Building — Alaa Al Aswany',
    fr: "L'Immeuble Yacoubian — Alaa El Aswany",
    es: 'El Edificio Yacoubian — Alaa Al Aswany',
    de: 'Der Jakubijan-Bau — Alaa al-Aswani',
    tr: 'Yakubyan Apartmanı — Alaa El Aswani',
  },
  'أولاد حارتنا — نجيب محفوظ': {
    en: 'Children of the Alley — Naguib Mahfouz',
    fr: 'Les Fils de la Médina — Naguib Mahfouz',
    es: 'Hijos de Nuestro Barrio — Naguib Mahfuz',
    de: 'Die Kinder unseres Viertels — Nagib Mahfuz',
    tr: 'Cebelavi Sokağının Çocukları — Necib Mahfuz',
  },
  'موسم الهجرة إلى الشمال — الطيب صالح': {
    en: 'Season of Migration to the North — Tayeb Salih',
    fr: 'Saison de la migration vers le nord — Tayeb Salih',
    es: 'Época de migración al norte — Tayeb Salih',
    de: 'Zeit der Nordwanderung — Tayeb Salih',
    tr: 'Kuzeye Göç Mevsimi — Tayeb Salih',
  },
  'البرمجة بلغة بايثون — دليل عملي': {
    en: 'Python Programming — Hands-On Practical Guide',
    fr: 'Programmation en Python — Guide Pratique',
    es: 'Programación en Python — Guía Práctica',
    de: 'Python-Programmierung — Praxishandbuch',
    tr: 'Python Programlama — Uygulamalı Rehber',
  },
  'تعلم تطوير المواقع — HTML, CSS, JS': {
    en: 'Full-Stack Web Development — HTML, CSS & JS',
    fr: 'Développement Web Moderne — HTML, CSS, JS',
    es: 'Desarrollo Web Completo — HTML, CSS y JS',
    de: 'Moderne Webentwicklung — HTML, CSS & JS',
    tr: 'Web Geliştirme Rehberi — HTML, CSS, JS',
  },
  'العادات الذرية — جيمس كلير': {
    en: 'Atomic Habits — James Clear',
    fr: 'Un rien peut tout changer (Atomic Habits) — James Clear',
    es: 'Hábitos Atómicos — James Clear',
    de: 'Die 1%-Methode (Atomic Habits) — James Clear',
    tr: 'Atomik Alışkanlıklar — James Clear',
  },
  'فن اللامبالاة — مارك مانسون': {
    en: 'The Subtle Art of Not Giving a F*ck — Mark Manson',
    fr: "L'Art subtil de s'en foutre — Mark Manson",
    es: 'El sutil arte de que (casi todo) te importe una mierda — Mark Manson',
    de: 'Die subtile Kunst des Daraufscheißens — Mark Manson',
    tr: 'Ustalık Gerektiren Kafaya Takmama Sanatı — Mark Manson',
  },
  'الأب الغني والأب الفقير': {
    en: 'Rich Dad Poor Dad — Robert Kiyosaki',
    fr: 'Père riche, père pauvre — Robert Kiyosaki',
    es: 'Padre Rico, Padre Pobre — Robert Kiyosaki',
    de: 'Rich Dad Poor Dad — Robert Kiyosaki',
    tr: 'Zengin Baba Yoksul Baba — Robert Kiyosaki',
  },
  'تاريخ مصر الحديث — عبد الرحمن الرافعي': {
    en: 'History of Modern Egypt — Abdel Rahman El-Rafei',
    fr: "Histoire de l'Égypte Moderne — Abdel Rahman El-Rafei",
    es: 'Historia del Egipto Moderno — Abdel Rahman El-Rafei',
    de: 'Geschichte des modernen Ägyptens — Abdel Rahman El-Rafei',
    tr: 'Modern Mısır Tarihi — Abdurrahman er-Rafii',
  },
  'مقدمة ابن خلدون': {
    en: 'The Muqaddimah — Ibn Khaldun (Critical Edition)',
    fr: 'La Muqaddimah (Prolégomènes) — Ibn Khaldoun',
    es: 'Muqaddimah (Introducción a la Historia) — Ibn Jaldún',
    de: 'Die Muqaddimah — Ibn Chaldūn',
    tr: 'Mukaddime — İbn Haldun',
  },
  'ثلاثية القاهرة — نجيب محفوظ': {
    en: 'The Cairo Trilogy (Deluxe Collector Edition) — Naguib Mahfouz',
    fr: 'La Trilogie du Caire (Édition Collector) — Naguib Mahfouz',
    es: 'La Trilogía de El Cairo (Edición de Lujo) — Naguib Mahfuz',
    de: 'Die Kairoer Trilogie (Sammlerausgabe) — Nagib Mahfuz',
    tr: 'Kahire Üçlemesi (Özel Baskı) — Necib Mahfuz',
  },
  'أساسيات الذكاء الاصطناعي': {
    en: 'Fundamentals of Artificial Intelligence & Machine Learning',
    fr: "Fondamentaux de l'Intelligence Artificielle",
    es: 'Fundamentos de Inteligencia Artificial y Machine Learning',
    de: 'Grundlagen der Künstlichen Intelligenz',
    tr: 'Yapay Zeka ve Makine Öğrenmesi Temelleri',
  },
  'ساق البامبو — سعود السنعوسي': {
    en: 'The Bamboo Stalk — Saud Alsanousi',
    fr: 'La Tige de bambou — Saud Alsanousi',
    es: 'El Tallo de Bambú — Saud Alsanousi',
    de: 'Der Bambusstängel — Saud Alsanousi',
    tr: 'Bambu Sapı — Suud es-Senusi',
  },
  'قميص كتان رجالي — أبيض': {
    en: "Men's 100% Pure Linen Shirt — Classic White",
    fr: 'Chemise en lin pur pour homme — Blanc classique',
    es: 'Camisa de lino puro para hombre — Blanco clásico',
    de: 'Herrenhemd aus 100% reinem Leinen — Weiß',
    tr: 'Erkek %100 Doğal Keten Gömlek — Beyaz',
  },
  'بنطلون تشينو رجالي — كحلي': {
    en: "Men's Cotton Chino Trousers — Navy Blue",
    fr: 'Pantalon chino en coton pour homme — Bleu marine',
    es: 'Pantalón chino de algodón para hombre — Azul marino',
    de: 'Herren-Chinohose aus Baumwolle — Marineblau',
    tr: 'Erkek Pamuklu Chino Pantolon — Lacivert',
  },
  'جاكيت جلد رجالي — بني': {
    en: "Men's Genuine Italian Leather Jacket — Cognac Brown",
    fr: 'Veste en cuir véritable italien pour homme — Marron',
    es: 'Chaqueta de cuero italiano genuino para hombre — Marrón',
    de: 'Herrenjacke aus echtem italienischem Leder — Braun',
    tr: 'Erkek Hakiki İtalyan Deri Ceket — Kahverengi',
  },
  'حذاء رياضي رجالي': {
    en: "Men's Lightweight Performance Sneakers",
    fr: 'Baskets légères confort pour homme',
    es: 'Zapatillas deportivas ligeras para hombre',
    de: 'Leichte Herren-Sneaker mit Komfortsohle',
    tr: 'Erkek Hafif ve Rahat Spor Ayakkabı',
  },
  'فستان سهرة — أسود': {
    en: 'Luxury Satin Evening Gown — Midnight Black',
    fr: 'Robe de soirée en satin de luxe — Noir',
    es: 'Vestido de noche de satén de lujo — Negro',
    de: 'Elegantes Satin-Abendkleid — Schwarz',
    tr: 'Lüks Saten Gece Elbisesi — Siyah',
  },
  'عباية مطرزة — كحلي': {
    en: 'Hand-Embroidered Crepe Abaya — Royal Navy',
    fr: 'Abaya en crêpe brodée à la main — Bleu marine',
    es: 'Abaya de crepé bordada a mano — Azul marino',
    de: 'Handbestickte Crêpe-Abaya — Marineblau',
    tr: 'El İşlemeli Krep Abaya — Lacivert',
  },
  'حقيبة يد جلد — بيج': {
    en: 'Genuine Leather Tote Handbag — Warm Beige',
    fr: 'Sac à main en cuir véritable — Beige',
    es: 'Bolso de mano de cuero genuino — Beige',
    de: 'Damen-Handtasche aus Echtleder — Beige',
    tr: 'Hakiki Deri Kadın El Çantası — Bej',
  },
  'وشاح حرير — ألوان مائية': {
    en: '100% Pure Silk Scarf — Watercolor Print',
    fr: 'Foulard 100% soie naturelle — Aquarelle',
    es: 'Pañuelo 100% seda natural — Acuarela',
    de: 'Tuch aus 100% reiner Seide — Aquarell-Print',
    tr: '%100 Doğal İpek Eşarp — Suluboya Desenli',
  },
  'طقم أطفال صيفي — ولادي': {
    en: "Boys' Soft Cotton Summer T-Shirt & Shorts Set",
    fr: "Ensemble d'été en coton doux pour garçon",
    es: 'Conjunto de verano de algodón suave para niño',
    de: 'Sommer-Set aus weicher Baumwolle für Jungen',
    tr: 'Erkek Çocuk Pamuklu Yazlık Tişört ve Şort Takımı',
  },
  'فستان أطفال — وردي': {
    en: "Girls' Cotton Party Dress — Rose Pink",
    fr: 'Robe de fête en coton pour fille — Rose',
    es: 'Vestido de algodón para niña — Rosa',
    de: 'Festliches Baumwollkleid für Mädchen — Rosa',
    tr: 'Kız Çocuk Pamuklu Parti Elbisesi — Pembe',
  },
  'طقم بيجاما رجالي': {
    en: "Men's Premium Cotton Loungewear Pajama Set",
    fr: 'Pyjama en coton premium pour homme',
    es: 'Conjunto de pijama de algodón premium para hombre',
    de: 'Herren-Pyjama-Set aus Premium-Baumwolle',
    tr: 'Erkek Lüks Pamuklu Pijama Takımı',
  },
  'بلوزة شيفون — بيج': {
    en: "Women's Elegant Chiffon Blouse — Beige",
    fr: 'Blouse élégante en mousseline pour femme — Beige',
    es: 'Blusa elegante de gasa para mujer — Beige',
    de: 'Elegante Damen-Chiffonbluse — Beige',
    tr: 'Kadın Şık Şifon Bluz — Bej',
  },
};

const STORE_NAME_TRANSLATIONS: Record<string, MultiLangEntry> = {
  'سوني ستور مصر': {
    en: 'Sony Store Egypt',
    fr: 'Sony Store Égypte',
    es: 'Sony Store Egipto',
    de: 'Sony Store Ägypten',
    tr: 'Sony Store Mısır',
  },
  'متجر سوني الرسمي': {
    en: 'Sony Official Store',
    fr: 'Boutique Officielle Sony',
    es: 'Tienda Oficial Sony',
    de: 'Offizieller Sony Store',
    tr: 'Sony Resmi Mağazası',
  },
  'دار الشروق للكتب': {
    en: 'Dar El Shorouk Bookstore',
    fr: 'Librairie Dar El Shorouk',
    es: 'Librería Dar El Shorouk',
    de: 'Dar El Shorouk Buchhandlung',
    tr: 'Dar El Shorouk Kitabevi',
  },
  'دار الشروق للنشر': {
    en: 'Dar El Shorouk Publishing',
    fr: 'Éditions Dar El Shorouk',
    es: 'Editorial Dar El Shorouk',
    de: 'Dar El Shorouk Verlag',
    tr: 'Dar El Shorouk Yayınevi',
  },
  'فاشن ماجستيك': {
    en: 'Fashion Majestic',
    fr: 'Fashion Majestic',
    es: 'Fashion Majestic',
    de: 'Fashion Majestic',
    tr: 'Fashion Majestic',
  },
  'أزياء ماجستيك': {
    en: 'Majestic Fashion House',
    fr: 'Maison de Mode Majestic',
    es: 'Moda Majestic',
    de: 'Majestic Modehaus',
    tr: 'Majestic Moda Evi',
  },
};

// Comprehensive UI & Seeded Content Phrase Dictionary (0ms Instant Translation across all pages)
const GLOBAL_PHRASE_TRANSLATIONS: Record<string, MultiLangEntry> = {
  ...PRODUCT_NAME_TRANSLATIONS,
  ...STORE_NAME_TRANSLATIONS,
  // Store Descriptions
  'أحدث الأجهزة الإلكترونية والسماعات والكاميرات من سوني مصر. وكيل معتمد مع ضمان رسمي.': {
    en: 'The latest electronics, headphones, and cameras from Sony Egypt. Authorized dealer with official warranty.',
    fr: 'Les derniers appareils électroniques, casques et appareils photo de Sony Égypte. Distributeur agréé avec garantie officielle.',
    es: 'Lo último en electrónica, auriculares y cámaras de Sony Egipto. Distribuidor autorizado con garantía oficial.',
    de: 'Die neuesten Elektronikgeräte, Kopfhörer und Kameras von Sony Ägypten. Autorisierter Händler mit offizieller Garantie.',
    tr: "Sony Mısır'dan en yeni elektronik cihazlar, kulaklıklar ve kameralar. Resmi garantili yetkili satıcı.",
  },
  'أكبر مكتبة عربية على الإنترنت. روايات، كتب تقنية، تطوير ذات، وتاريخ.': {
    en: 'The largest Arabic online bookstore. Novels, tech books, self-development, and history.',
    fr: 'La plus grande librairie en ligne. Romans, livres techniques, développement personnel et histoire.',
    es: 'La mayor librería en línea. Novelas, libros técnicos, desarrollo personal e historia.',
    de: 'Die größte Online-Buchhandlung. Romane, Fachbücher, Persönlichkeitsentwicklung und Geschichte.',
    tr: 'En büyük çevrimiçi kitabevi. Romanlar, teknoloji kitapları, kişisel gelişim ve tarih.',
  },
  'أزياء عصرية للرجال والنساء والأطفال. ماركات أصلية بأسعار مناسبة.': {
    en: 'Modern fashion for men, women, and kids. Authentic brands at great prices.',
    fr: 'Mode moderne pour hommes, femmes et enfants. Marques authentiques à prix abordables.',
    es: 'Moda moderna para hombres, mujeres y niños. Marcas auténticas a precios accesibles.',
    de: 'Moderne Mode für Herren, Damen und Kinder. Originalmarken zu fairen Preisen.',
    tr: 'Erkek, kadın ve çocuklar için modern moda. Uygun fiyatlarla orijinal markalar.',
  },
  // Seeded Reviews
  'شراء موفق': { en: 'Great purchase', fr: 'Excellent achat', es: 'Excelente compra', de: 'Toller Kauf', tr: 'Harika alışveriş' },
  'جودة ممتازة': { en: 'Excellent quality', fr: 'Excellente qualité', es: 'Calidad excelente', de: 'Ausgezeichnete Qualität', tr: 'Mükemmel kalite' },
  'أنصح به': { en: 'Highly recommended', fr: 'Je recommande', es: 'Muy recomendado', de: 'Sehr empfehlenswert', tr: 'Kesinlikle tavsiye ederim' },
  'سعر مناسب': { en: 'Great value', fr: 'Bon rapport qualité-prix', es: 'Buen precio', de: 'Gutes Preis-Leistungs-Verhältnis', tr: 'Uygun fiyat' },
  'ممتاز': { en: 'Excellent', fr: 'Excellent', es: 'Excelente', de: 'Ausgezeichnet', tr: 'Mükemmel' },
  'جيد': { en: 'Good', fr: 'Bien', es: 'Bueno', de: 'Gut', tr: 'İyi' },
  'راضي جداً': { en: 'Very satisfied', fr: 'Très satisfait', es: 'Muy satisfecho', de: 'Sehr zufrieden', tr: 'Çok memnunum' },
  'فوق المتوقع': { en: 'Exceeded expectations', fr: 'Au-delà des attentes', es: 'Superó las expectativas', de: 'Erwartungen übertroffen', tr: 'Beklentilerin üzerinde' },
  'يستاهل': { en: 'Worth every penny', fr: 'Vaut vraiment le coup', es: 'Vale totalmente la pena', de: 'Jeden Cent wert', tr: 'Fiyatına değer' },
  'رائع': { en: 'Wonderful', fr: 'Magnifique', es: 'Maravilloso', de: 'Wunderbar', tr: 'Harika' },
  'منتج ممتاز والتوصيل كان سريع': { en: 'Excellent product and fast delivery!', fr: 'Excellent produit et livraison rapide !', es: '¡Excelente producto y entrega rápida!', de: 'Ausgezeichnetes Produkt und schnelle Lieferung!', tr: 'Mükemmel ürün ve hızlı teslimat!' },
  'جودة عالية جداً وأنصح بالشراء': { en: 'Very high quality, highly recommend buying.', fr: 'Très haute qualité, je recommande vivement.', es: 'Muy alta calidad, recomiendo mucho su compra.', de: 'Sehr hohe Qualität, klare Kaufempfehlung.', tr: 'Çok yüksek kalite, satın almanızı tavsiye ederim.' },
  'المنتج مطابق للوصف تماماً': { en: 'Product matches the description 100%.', fr: 'Le produit correspond parfaitement à la description.', es: 'El producto coincide exactamente con la descripción.', de: 'Das Produkt entspricht genau der Beschreibung.', tr: 'Ürün açıklamayla birebir aynı.' },
  'سعر مناسب مقابل الجودة': { en: 'Great price for the quality offered.', fr: 'Excellent prix pour cette qualité.', es: 'Excelente precio para la calidad ofrecida.', de: 'Toller Preis für diese Qualität.', tr: 'Kalitesine göre fiyatı çok uygun.' },
  'تجربة شراء مميزة وخدمة عملاء ممتازة': { en: 'Great shopping experience and wonderful customer service.', fr: "Superbe expérience d'achat et service client au top.", es: 'Gran experiencia de compra y excelente atención al cliente.', de: 'Tolles Einkaufserlebnis und hervorragender Kundenservice.', tr: 'Harika alışveriş deneyimi ve mükemmel müşteri hizmetleri.' },
  'المنتج جيد لكن التغليف محتاج تحسين': { en: 'Good product, though packaging could be improved.', fr: "Bon produit, mais l'emballage pourrait être amélioré.", es: 'Buen producto, aunque el embalaje podría mejorar.', de: 'Gutes Produkt, aber die Verpackung könnte besser sein.', tr: 'Ürün iyi ancak paketleme geliştirilebilir.' },
  'راضي عن المنتج بشكل عام': { en: 'Overall very satisfied with the product.', fr: 'Globalement très satisfait du produit.', es: 'Satisfecho con el producto en general.', de: 'Insgesamt sehr zufrieden mit dem Produkt.', tr: 'Genel olarak üründen memnunum.' },
  'المنتج فاق توقعاتي بصراحة': { en: 'Honestly exceeded my expectations!', fr: 'A franchement dépassé mes attentes !', es: '¡Sinceramente superó mis expectativas!', de: 'Hat meine Erwartungen ehrlich übertroffen!', tr: 'Açıkçası beklentilerimi aştı!' },
  'هيكون عندي تاني طلب قريب إن شاء الله': { en: 'Will definitely order again soon!', fr: 'Je recommanderai très bientôt !', es: '¡Definitivamente volveré a pedir pronto!', de: 'Ich werde definitiv bald wieder bestellen!', tr: 'Yakında tekrar sipariş vereceğim!' },
  'أفضل سعر لقيته على الإنترنت': { en: 'Best price I found online.', fr: 'Le meilleur prix trouvé en ligne.', es: 'El mejor precio que encontré en internet.', de: 'Der beste Preis, den ich online gefunden habe.', tr: 'İnternette bulduğum en iyi fiyat.' },
  'الخامات ممتازة والتصميم جميل': { en: 'Premium materials and beautiful design.', fr: 'Matériaux excellents et beau design.', es: 'Materiales excelentes y hermoso diseño.', de: 'Hochwertige Materialien und schönes Design.', tr: 'Malzeme kalitesi mükemmel ve tasarımı çok güzel.' },
  'وصل في الموعد المحدد': { en: 'Arrived right on time.', fr: 'Arrivé pile à l’heure.', es: 'Llegó justo a tiempo.', de: 'Pünktlich geliefert.', tr: 'Tam zamanında ulaştı.' },
  'المنتج أصلي ومطابق للمواصفات': { en: '100% authentic and matches specifications.', fr: 'Produit authentique et conforme aux spécifications.', es: 'Producto original y acorde a las especificaciones.', de: 'Originalprodukt und entspricht den Spezifikationen.', tr: 'Ürün orijinal ve özellikleriyle birebir uyumlu.' },
  'خامات ممتازة وراقية': { en: 'High-end, refined materials.', fr: 'Matériaux nobles et d’excellente qualité.', es: 'Materiales excelentes y elegantes.', de: 'Exzellente und edle Materialien.', tr: 'Mükemmel ve kaliteli malzeme.' },
  'هبقى عميل دائم عندكم': { en: 'I will be a regular customer here!', fr: 'Je vais devenir un client fidèle !', es: '¡Seré un cliente habitual!', de: 'Ich werde Stammkunde bei Ihnen!', tr: 'Daimi müşteriniz olacağım!' },
  'منتج عملي ومفيد جداً': { en: 'Very practical and useful product.', fr: 'Produit très pratique et utile.', es: 'Producto muy práctico y útil.', de: 'Sehr praktisches und nützliches Produkt.', tr: 'Çok pratik ve kullanışlı bir ürün.' },
  'شكراً لتقييمك الكريم! نسعد بخدمتك دائماً.': { en: 'Thank you for your kind review! Always happy to serve you.', fr: 'Merci pour votre avis ! Toujours ravis de vous servir.', es: '¡Gracias por tu amable reseña! Siempre encantados de atenderte.', de: 'Vielen Dank für Ihre Bewertung! Wir freuen uns, Sie wieder zu begrüßen.', tr: 'Değerli yorumunuz için teşekkürler! Size her zaman hizmet vermekten mutluluk duyarız.' },

  // Common UI Labels across Admin, Vendor, Cart, Checkout, Orders, Profile, Wishlist, Auth, Chat
  'لوحة التحكم': { en: 'Dashboard', fr: 'Tableau de bord', es: 'Panel de Control', de: 'Dashboard', tr: 'Kontrol Paneli' },
  'لوحة الإدارة': { en: 'Admin Console', fr: 'Administration', es: 'Panel de Administración', de: 'Admin-Konsole', tr: 'Yönetim Paneli' },
  'لوحة البائع': { en: 'Seller Hub', fr: 'Espace Vendeur', es: 'Panel de Vendedor', de: 'Händlerbereich', tr: 'Satıcı Paneli' },
  'لوحة تحكم المتجر': { en: 'Store Dashboard', fr: 'Tableau de bord Boutique', es: 'Panel de la Tienda', de: 'Shop-Dashboard', tr: 'Mağaza Paneli' },
  'التحليلات': { en: 'Analytics', fr: 'Analytique', es: 'Analíticas', de: 'Analysen', tr: 'Analitik' },
  'البائعين': { en: 'Vendors', fr: 'Vendeurs', es: 'Vendedores', de: 'Händler', tr: 'Satıcılar' },
  'البائعين المعتمدين': { en: 'Approved Vendors', fr: 'Vendeurs Approuvés', es: 'Vendedores Aprobados', de: 'Geprüfte Händler', tr: 'Onaylı Satıcılar' },
  'بائعين بانتظار الموافقة': { en: 'Pending Vendors', fr: 'Vendeurs en Attente', es: 'Vendedores Pendientes', de: 'Ausstehende Händler', tr: 'Onay Bekleyen Satıcılar' },
  'قواعد العمولة': { en: 'Commission Rules', fr: 'Règles de Commission', es: 'Reglas de Comisión', de: 'Provisionsregeln', tr: 'Komisyon Kuralları' },
  'المنتجات': { en: 'Products', fr: 'Produits', es: 'Productos', de: 'Produkte', tr: 'Ürünler' },
  'الطلبات': { en: 'Orders', fr: 'Commandes', es: 'Pedidos', de: 'Bestellungen', tr: 'Siparişler' },
  'إجمالي الطلبات': { en: 'Total Orders', fr: 'Total Commandes', es: 'Total de Pedidos', de: 'Gesamtbestellungen', tr: 'Toplam Sipariş' },
  'إجمالي الإيرادات': { en: 'Total Revenue', fr: 'Revenu Total', es: 'Ingresos Totales', de: 'Gesamtumsatz', tr: 'Toplam Gelir' },
  'الإيرادات': { en: 'Revenue', fr: 'Revenus', es: 'Ingresos', de: 'Umsatz', tr: 'Gelir' },
  'طلبات معلقة': { en: 'Pending Orders', fr: 'Commandes en Attente', es: 'Pedidos Pendientes', de: 'Offene Bestellungen', tr: 'Bekleyen Siparişler' },
  'العمولة': { en: 'Commission', fr: 'Commission', es: 'Comisión', de: 'Provision', tr: 'Komisyon' },
  'التسويات': { en: 'Settlements', fr: 'Règlements', es: 'Liquidaciones', de: 'Abrechnungen', tr: 'Mutabakatlar' },
  'طلبات السحب': { en: 'Payout Requests', fr: 'Demandes de Retrait', es: 'Solicitudes de Retiro', de: 'Auszahlungsanträge', tr: 'Ödeme Talepleri' },
  'المعاملات المالية': { en: 'Financial Transactions', fr: 'Transactions Financières', es: 'Transacciones Financieras', de: 'Finanztransaktionen', tr: 'Finansal İşlemler' },
  'المستخدمين': { en: 'Users', fr: 'Utilisateurs', es: 'Usuarios', de: 'Benutzer', tr: 'Kullanıcılar' },
  'الأدوار والصلاحيات': { en: 'Roles & Permissions', fr: 'Rôles & Permissions', es: 'Roles y Permisos', de: 'Rollen & Berechtigungen', tr: 'Roller ve İzinler' },
  'الأقسام': { en: 'Categories', fr: 'Catégories', es: 'Categorías', de: 'Kategorien', tr: 'Kategoriler' },
  'المرتجعات': { en: 'Refunds & Returns', fr: 'Remboursements', es: 'Devoluciones', de: 'Rückerstattungen', tr: 'İadeler' },
  'الكوبونات': { en: 'Coupons', fr: 'Coupons', es: 'Cupones', de: 'Gutscheine', tr: 'Kuponlar' },
  'عروض الباقات': { en: 'Plan Promotions', fr: 'Promotions Forfaits', es: 'Promociones de Planes', de: 'Paket-Aktionen', tr: 'Paket Kampanyaları' },
  'سجل الرسائل': { en: 'Message Logs', fr: 'Journal des Messages', es: 'Registro de Mensajes', de: 'Nachrichtenprotokoll', tr: 'Mesaj Kayıtları' },
  'الإعدادات': { en: 'Settings', fr: 'Paramètres', es: 'Configuración', de: 'Einstellungen', tr: 'Ayarlar' },
  'إعدادات المتجر': { en: 'Store Settings', fr: 'Paramètres Boutique', es: 'Ajustes de Tienda', de: 'Shop-Einstellungen', tr: 'Mağaza Ayarları' },
  'المساعد الذكي': { en: 'AI Assistant', fr: 'Assistant IA', es: 'Asistente IA', de: 'KI-Assistent', tr: 'Yapay Zeka Asistanı' },
  'الأرباح': { en: 'Earnings', fr: 'Revenus', es: 'Ganancias', de: 'Einnahmen', tr: 'Kazançlar' },
  'الباقات والاشتراكات': { en: 'Subscriptions & Plans', fr: 'Forfaits & Abonnements', es: 'Planes y Suscripciones', de: 'Pakete & Abonnements', tr: 'Paketler ve Abonelikler' },
  'عرض الباقات والترقية': { en: 'View Plans & Upgrade', fr: 'Voir les Forfaits', es: 'Ver Planes y Mejorar', de: 'Pakete Ansehen & Upgraden', tr: 'Paketleri Gör ve Yükselt' },
  'أحدث الطلبات': { en: 'Recent Orders', fr: 'Commandes Récentes', es: 'Pedidos Recientes', de: 'Neueste Bestellungen', de_alt: 'Neueste Bestellungen', tr: 'Son Siparişler' } as any,
  'رقم الطلب': { en: 'Order #', fr: 'N° Commande', es: 'N.º Pedido', de: 'Bestell-Nr.', tr: 'Sipariş No' },
  'العميل': { en: 'Customer', fr: 'Client', es: 'Cliente', de: 'Kunde', tr: 'Müşteri' },
  'المبلغ': { en: 'Amount', fr: 'Montant', es: 'Importe', de: 'Betrag', tr: 'Tutar' },
  'الحالة': { en: 'Status', fr: 'Statut', es: 'Estado', de: 'Status', tr: 'Durum' },
  'التاريخ': { en: 'Date', fr: 'Date', es: 'Fecha', de: 'Datum', tr: 'Tarih' },
  'المتجر': { en: 'Store', fr: 'Boutique', es: 'Tienda', de: 'Shop', tr: 'Mağaza' },
  'النوع': { en: 'Type', fr: 'Type', es: 'Tipo', de: 'Typ', tr: 'Tür' },
  'الوصف': { en: 'Description', fr: 'Description', es: 'Descripción', de: 'Beschreibung', tr: 'Açıklama' },
  'العودة للمتجر': { en: 'Back to Store', fr: 'Retour à la Boutique', es: 'Volver a la Tienda', de: 'Zurück zum Shop', tr: 'Mağazaya Dön' },
  'سلة التسوق': { en: 'Shopping Cart', fr: 'Panier', es: 'Carrito de Compras', de: 'Warenkorb', tr: 'Alışveriş Sepeti' },
  'السلة فارغة': { en: 'Your cart is empty', fr: 'Votre panier est vide', es: 'Tu carrito está vacío', de: 'Ihr Warenkorb ist leer', tr: 'Sepetiniz boş' },
  'ابدأ التسوق وأضف منتجات لسلتك': { en: 'Start shopping and add items to your cart', fr: 'Commencez vos achats et ajoutez des articles', es: 'Empieza a comprar y añade productos a tu carrito', de: 'Starten Sie Ihren Einkauf und fügen Sie Artikel hinzu', tr: 'Alışverişe başlayın ve sepetinize ürün ekleyin' },
  'تصفّح المنتجات': { en: 'Browse Products', fr: 'Parcourir les Produits', es: 'Explorar Productos', de: 'Produkte Entdecken', tr: 'Ürünleri Keşfet' },
  'تصفح المنتجات': { en: 'Browse Products', fr: 'Parcourir les Produits', es: 'Explorar Productos', de: 'Produkte Entdecken', tr: 'Ürünleri Keşfet' },
  'تفريغ السلة': { en: 'Clear Cart', fr: 'Vider le Panier', es: 'Vaciar Carrito', de: 'Warenkorb Leeren', tr: 'Sepeti Boşalt' },
  'ملخص الطلب': { en: 'Order Summary', fr: 'Récapitulatif', es: 'Resumen del Pedido', de: 'Bestellübersicht', tr: 'Sipariş Özeti' },
  'المجموع الفرعي': { en: 'Subtotal', fr: 'Sous-total', es: 'Subtotal', de: 'Zwischensumme', tr: 'Ara Toplam' },
  'الشحن': { en: 'Shipping', fr: 'Livraison', es: 'Envío', de: 'Versand', tr: 'Kargo' },
  'يُحسب عند الدفع': { en: 'Calculated at checkout', fr: 'Calculé au paiement', es: 'Calculado al pagar', de: 'Wird an der Kasse berechnet', tr: 'Ödeme adımında hesaplanır' },
  'الإجمالي': { en: 'Total', fr: 'Total', es: 'Total', de: 'Gesamt', tr: 'Toplam' },
  'إتمام الشراء': { en: 'Proceed to Checkout', fr: 'Passer la Commande', es: 'Finalizar Compra', de: 'Zur Kasse', tr: 'Alışverişi Tamamla' },
  'المفضلة': { en: 'Wishlist', fr: 'Favoris', es: 'Favoritos', de: 'Wunschliste', tr: 'Favorilerim' },
  'المفضلة فارغة': { en: 'Your wishlist is empty', fr: 'Votre liste de favoris est vide', es: 'Tu lista de favoritos está vacía', de: 'Ihre Wunschliste ist leer', tr: 'Favori listeniz boş' },
  'أضف منتجات إلى المفضلة لتجدها بسهولة لاحقاً': { en: 'Save your favorite items here to find them easily later', fr: 'Ajoutez des produits à vos favoris pour les retrouver facilement', es: 'Añade productos a favoritos para encontrarlos fácilmente después', de: 'Fügen Sie Produkte zur Wunschliste hinzu, um sie später leicht wiederzufinden', tr: 'Daha sonra kolayca bulmak için ürünleri favorilerinize ekleyin' },
  'إزالة من المفضلة': { en: 'Remove from Wishlist', fr: 'Retirer des Favoris', es: 'Quitar de Favoritos', de: 'Von Wunschliste Entfernen', tr: 'Favorilerden Çıkar' },
  'طلباتي': { en: 'My Orders', fr: 'Mes Commandes', es: 'Mis Pedidos', de: 'Meine Bestellungen', tr: 'Siparişlerim' },
  'لا توجد طلبات': { en: 'No orders yet', fr: 'Aucune commande', es: 'No hay pedidos aún', de: 'Noch keine Bestellungen', tr: 'Henüz sipariş yok' },
  'ابدأ التسوق وأنشئ أول طلب لك': { en: 'Start shopping and place your first order', fr: 'Commencez vos achats et passez votre première commande', es: 'Empieza a comprar y realiza tu primer pedido', de: 'Jetzt einkaufen und erste Bestellung aufgeben', tr: 'Alışverişe başlayın ve ilk siparişinizi oluşturun' },
  'إلغاء الطلب': { en: 'Cancel Order', fr: 'Annuler la Commande', es: 'Cancelar Pedido', de: 'Bestellung Stornieren', tr: 'Siparişi İptal Et' },
  'طلب استرجاع': { en: 'Request Return', fr: 'Demander un Retour', es: 'Solicitar Devolución', de: 'Rückgabe Anfordern', tr: 'İade Talebi' },
  'تتبع الشحنة': { en: 'Track Shipment', fr: 'Suivre le Colis', es: 'Rastrear Envío', de: 'Sendung Verfolgen', tr: 'Kargo Takibi' },
  'حسابي': { en: 'My Account', fr: 'Mon Compte', es: 'Mi Cuenta', de: 'Mein Konto', tr: 'Hesabım' },
  'المعلومات الشخصية': { en: 'Personal Information', fr: 'Informations Personnelles', es: 'Información Personal', de: 'Persönliche Daten', tr: 'Kişisel Bilgiler' },
  'الاسم الأول': { en: 'First Name', fr: 'Prénom', es: 'Nombre', de: 'Vorname', tr: 'Ad' },
  'اسم العائلة': { en: 'Last Name', fr: 'Nom', es: 'Apellido', de: 'Nachname', tr: 'Soyad' },
  'رقم الهاتف': { en: 'Phone Number', fr: 'Téléphone', es: 'Teléfono', de: 'Telefonnummer', tr: 'Telefon Numarası' },
  'البريد الإلكتروني': { en: 'Email Address', fr: 'Adresse E-mail', es: 'Correo Electrónico', de: 'E-Mail-Adresse', tr: 'E-posta Adresi' },
  'حفظ التغييرات': { en: 'Save Changes', fr: 'Enregistrer', es: 'Guardar Cambios', de: 'Änderungen Speichern', tr: 'Değişiklikleri Kaydet' },
  'تغيير كلمة المرور': { en: 'Change Password', fr: 'Changer le Mot de Passe', es: 'Cambiar Contraseña', de: 'Passwort Ändern', tr: 'Şifreyi Değiştir' },
  'كلمة المرور الحالية': { en: 'Current Password', fr: 'Mot de Passe Actuel', es: 'Contraseña Actual', de: 'Aktuelles Passwort', tr: 'Mevcut Şifre' },
  'كلمة المرور الجديدة': { en: 'New Password', fr: 'Nouveau Mot de Passe', es: 'Nueva Contraseña', de: 'Neues Passwort', tr: 'Yeni Şifre' },
  'تأكيد كلمة المرور': { en: 'Confirm Password', fr: 'Confirmer le Mot de Passe', es: 'Confirmar Contraseña', de: 'Passwort Bestätigen', tr: 'Şifreyi Onayla' },
  'المصادقة الثنائية (2FA)': { en: 'Two-Factor Authentication (2FA)', fr: 'Authentification à Deux Facteurs (2FA)', es: 'Autenticación de Dos Factores (2FA)', de: 'Zwei-Faktor-Authentifizierung (2FA)', tr: 'İki Faktörlü Kimlik Doğrulama (2FA)' },
  'إعداد المصادقة الثنائية': { en: 'Setup Two-Factor Auth', fr: 'Configurer la 2FA', es: 'Configurar 2FA', de: '2FA Einrichten', tr: '2FA Kurulumu' },
  'تفضيلات الإشعارات': { en: 'Notification Preferences', fr: 'Préférences de Notification', es: 'Preferencias de Notificación', de: 'Benachrichtigungseinstellungen', tr: 'Bildirim Tercihleri' },
  'تحديثات الطلبات': { en: 'Order Updates', fr: 'Mises à jour des Commandes', es: 'Actualizaciones de Pedidos', de: 'Bestell-Updates', tr: 'Sipariş Güncellemeleri' },
  'العروض والخصومات': { en: 'Promotions & Deals', fr: 'Offres & Promotions', es: 'Ofertas y Descuentos', de: 'Angebote & Rabatte', tr: 'Kampanyalar ve İndirimler' },
  'تنبيهات المخزون': { en: 'Stock Alerts', fr: 'Alertes de Stock', es: 'Alertas de Stock', de: 'Lagerbestandswarnungen', tr: 'Stok Uyarıları' },
  'إشعارات النظام': { en: 'System Notifications', fr: 'Notifications Système', es: 'Notificaciones del Sistema', de: 'Systembenachrichtigungen', tr: 'Sistem Bildirimleri' },
  'الرسائل النصية': { en: 'SMS', fr: 'SMS', es: 'SMS', de: 'SMS', tr: 'SMS' },
  'إشعارات التطبيق': { en: 'In-App Notifications', fr: 'Notifications In-App', es: 'Notificaciones en la App', de: 'In-App-Benachrichtigungen', tr: 'Uygulama İçi Bildirimler' },
  'الإشعارات': { en: 'Notifications', fr: 'Notifications', es: 'Notificaciones', de: 'Benachrichtigungen', tr: 'Bildirimler' },
  'قيد الانتظار': { en: 'Pending', fr: 'En attente', es: 'Pendiente', de: 'Ausstehend', tr: 'Beklemede' },
  'مؤكد': { en: 'Confirmed', fr: 'Confirmée', es: 'Confirmado', de: 'Bestätigt', tr: 'Onaylandı' },
  'قيد التجهيز': { en: 'Processing', fr: 'En préparation', es: 'En proceso', de: 'In Bearbeitung', tr: 'Hazırlanıyor' },
  'تم الشحن': { en: 'Shipped', fr: 'Expédiée', es: 'Enviado', de: 'Versandt', tr: 'Kargoya Verildi' },
  'تم التوصيل': { en: 'Delivered', fr: 'Livrée', es: 'Entregado', de: 'Zugestellt', tr: 'Teslim Edildi' },
  'ملغي': { en: 'Cancelled', fr: 'Annulée', es: 'Cancelado', de: 'Storniert', tr: 'İptal Edildi' },
  'مسترجع': { en: 'Refunded', fr: 'Remboursée', es: 'Reembolsado', de: 'Erstattet', tr: 'İade Edildi' },
  'أضف للسلة': { en: 'Add to Cart', fr: 'Ajouter au Panier', es: 'Añadir al Carrito', de: 'In den Warenkorb', tr: 'Sepete Ekle' },
  'نفذ من المخزون': { en: 'Out of Stock', fr: 'Rupture de Stock', es: 'Agotado', de: 'Ausverkauft', tr: 'Stokta Yok' },
  'إلغاء': { en: 'Cancel', fr: 'Annuler', es: 'Cancelar', de: 'Abbrechen', tr: 'İptal' },
  'حفظ': { en: 'Save', fr: 'Enregistrer', es: 'Guardar', de: 'Speichern', tr: 'Kaydet' },
  'تعديل': { en: 'Edit', fr: 'Modifier', es: 'Editar', de: 'Bearbeiten', tr: 'Düzenle' },
  'حذف': { en: 'Delete', fr: 'Supprimer', es: 'Eliminar', de: 'Löschen', tr: 'Sil' },
  'إضافة': { en: 'Add', fr: 'Ajouter', es: 'Añadir', de: 'Hinzufügen', tr: 'Ekle' },
  'بحث': { en: 'Search', fr: 'Rechercher', es: 'Buscar', de: 'Suchen', tr: 'Ara' },
};

const ARABIC_CHAR_REGEX = /[\u0600-\u06FF]/;
const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

function normalizeArabicDigits(str: string): string {
  let out = str;
  for (let i = 0; i < 10; i++) {
    out = out.replaceAll(ARABIC_DIGITS[i]!, String(i));
  }
  return out.replaceAll('٬', ',').replaceAll('٫', '.');
}

// Persistent Neural Translation Cache (Memory + localStorage)
const memoryNeuralCache: Record<SupportedLang, Record<string, string>> = {
  ar: {},
  en: {},
  fr: {},
  es: {},
  de: {},
  tr: {},
};

function loadCachedTranslations(lang: SupportedLang): Record<string, string> {
  if (Object.keys(memoryNeuralCache[lang]).length > 0) {
    return memoryNeuralCache[lang];
  }
  try {
    const raw = localStorage.getItem(`i18n_neural_v2_${lang}`);
    if (raw) {
      memoryNeuralCache[lang] = JSON.parse(raw);
    }
  } catch {
    // ignore storage errors
  }
  return memoryNeuralCache[lang];
}

function saveCachedTranslations(lang: SupportedLang, additions: Record<string, string>) {
  const bucket = loadCachedTranslations(lang);
  Object.assign(bucket, additions);
  try {
    localStorage.setItem(`i18n_neural_v2_${lang}`, JSON.stringify(bucket));
  } catch {
    // ignore quota errors
  }
}

export function translateInstant(rawText: string, targetLang: SupportedLang): string | null {
  if (!rawText || targetLang === 'ar') return rawText;
  const trimmed = rawText.trim();
  if (!trimmed) return rawText;

  // 1. Check Category Slug Map
  const catSlug = ARABIC_CATEGORY_SLUG_MAP[trimmed];
  if (catSlug && translations[targetLang]?.[`cat.${catSlug}`]) {
    return rawText.replace(trimmed, translations[targetLang][`cat.${catSlug}`]!);
  }

  // 2. Check Global Phrase & Product Dictionary
  const dictHit = GLOBAL_PHRASE_TRANSLATIONS[trimmed];
  if (dictHit) {
    const val = dictHit[targetLang] || dictHit.en;
    if (val) return rawText.replace(trimmed, val);
  }

  // 3. Check Neural Cache
  const cache = loadCachedTranslations(targetLang);
  if (cache[trimmed]) {
    return rawText.replace(trimmed, cache[trimmed]!);
  }

  // 4. Smart Pattern Matchers (Prices, Order #s, Counts)
  if (trimmed.includes('ج.م')) {
    const converted = normalizeArabicDigits(trimmed).replace(/\s*ج\.م/g, ' EGP');
    if (!ARABIC_CHAR_REGEX.test(converted)) {
      return converted;
    }
  }

  const orderMatch = trimmed.match(/^طلب\s*#(.+)$/);
  if (orderMatch) {
    const prefixMap: MultiLangEntry = {
      en: 'Order #',
      fr: 'Commande #',
      es: 'Pedido #',
      de: 'Bestellung #',
      tr: 'Sipariş #',
    };
    return `${prefixMap[targetLang]}${orderMatch[1]}`;
  }

  const remainingMatch = trimmed.match(/^متبقي\s*(\d+|[٠-٩]+)$/);
  if (remainingMatch) {
    const num = normalizeArabicDigits(remainingMatch[1]!);
    const fmtMap: MultiLangEntry = {
      en: `${num} left`,
      fr: `${num} restants`,
      es: `Quedan ${num}`,
      de: `Noch ${num}`,
      tr: `${num} adet kaldı`,
    };
    return fmtMap[targetLang];
  }

  return null;
}

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
  translateProductName: (name: string) => string;
  translateStoreName: (name: string) => string;
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
  const originalTextMapRef = useRef<WeakMap<Text, string>>(new WeakMap());
  const lastTranslatedValueMapRef = useRef<WeakMap<Text, string>>(new WeakMap());
  const originalAttrMapRef = useRef<WeakMap<Element, Map<string, string>>>(new WeakMap());
  const pendingQueueRef = useRef<Set<string>>(new Set());
  const flushTimerRef = useRef<number | null>(null);

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

  // Automatic Real-Time DOM + Dynamic Content Translator
  useEffect(() => {
    if (typeof window === 'undefined' || !document.body) return;

    const originalTextMap = originalTextMapRef.current;
    const lastTranslatedValueMap = lastTranslatedValueMapRef.current;
    const originalAttrMap = originalAttrMapRef.current;
    let isDisposed = false;

    const flushPendingNeuralTranslations = async (targetLang: SupportedLang) => {
      if (targetLang === 'ar' || pendingQueueRef.current.size === 0) return;
      const batch = Array.from(pendingQueueRef.current).slice(0, 60);
      batch.forEach(item => pendingQueueRef.current.delete(item));

      try {
        const res = await fetch('/api/store/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texts: batch, targetLang }),
        });
        if (!res.ok || isDisposed) return;
        const json = await res.json();
        const map: Record<string, string> = json?.data?.translations || json?.translations || {};
        if (Object.keys(map).length > 0) {
          saveCachedTranslations(targetLang, map);
          if (!isDisposed) {
            scanAndTranslateSubtree(document.body, targetLang, false);
          }
        }
      } catch {
        // ignore network errors
      }
    };

    const scheduleFlush = (targetLang: SupportedLang) => {
      if (flushTimerRef.current !== null) return;
      flushTimerRef.current = window.setTimeout(() => {
        flushTimerRef.current = null;
        void flushPendingNeuralTranslations(targetLang);
      }, 60);
    };

    const processTextNode = (node: Text, targetLang: SupportedLang, enqueueMissing: boolean) => {
      const parent = node.parentElement;
      if (!parent) return;
      const tag = parent.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'CODE' || tag === 'TEXTAREA') {
        return;
      }
      if (parent.closest('.lang-switcher-menu')) return;

      const currentVal = node.nodeValue || '';
      const lastSetVal = lastTranslatedValueMap.get(node);

      // If React updated the underlying text node with a new source string, update originalTextMap
      if (!originalTextMap.has(node) || (lastSetVal !== undefined && currentVal !== lastSetVal)) {
        originalTextMap.set(node, currentVal);
      }

      const sourceText = originalTextMap.get(node) || '';
      if (!sourceText.trim()) return;

      if (targetLang === 'ar') {
        if (node.nodeValue !== sourceText) {
          lastTranslatedValueMap.set(node, sourceText);
          node.nodeValue = sourceText;
        }
        return;
      }

      const instant = translateInstant(sourceText, targetLang);
      if (instant !== null) {
        if (node.nodeValue !== instant) {
          lastTranslatedValueMap.set(node, instant);
          node.nodeValue = instant;
        }
        return;
      }

      // If the text still contains Arabic script, queue it for automatic neural translation
      if (enqueueMissing && ARABIC_CHAR_REGEX.test(sourceText)) {
        // Also normalize digits/currency immediately while neural translation is in flight
        const interim = normalizeArabicDigits(sourceText).replace(/\s*ج\.م/g, ' EGP');
        if (node.nodeValue !== interim) {
          lastTranslatedValueMap.set(node, interim);
          node.nodeValue = interim;
        }
        pendingQueueRef.current.add(sourceText.trim());
        scheduleFlush(targetLang);
      }
    };

    const processElementAttributes = (el: Element, targetLang: SupportedLang, enqueueMissing: boolean) => {
      if (el.closest('.lang-switcher-menu')) return;
      const attrs = ['placeholder', 'title', 'aria-label'];
      let attrMap = originalAttrMap.get(el);
      if (!attrMap) {
        attrMap = new Map<string, string>();
        originalAttrMap.set(el, attrMap);
      }

      for (const attr of attrs) {
        const current = el.getAttribute(attr);
        if (!current) continue;
        if (!attrMap.has(attr)) {
          attrMap.set(attr, current);
        }
        const source = attrMap.get(attr)!;
        if (targetLang === 'ar') {
          if (current !== source) el.setAttribute(attr, source);
          continue;
        }
        const instant = translateInstant(source, targetLang);
        if (instant !== null) {
          if (current !== instant) el.setAttribute(attr, instant);
        } else if (enqueueMissing && ARABIC_CHAR_REGEX.test(source)) {
          pendingQueueRef.current.add(source.trim());
          scheduleFlush(targetLang);
        }
      }
    };

    const scanAndTranslateSubtree = (root: Node, targetLang: SupportedLang, enqueueMissing = true) => {
      if (root.nodeType === Node.TEXT_NODE) {
        processTextNode(root as Text, targetLang, enqueueMissing);
        return;
      }
      if (root.nodeType === Node.ELEMENT_NODE) {
        processElementAttributes(root as Element, targetLang, enqueueMissing);
      }
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
      let current: Node | null = walker.nextNode();
      while (current) {
        if (current.nodeType === Node.TEXT_NODE) {
          processTextNode(current as Text, targetLang, enqueueMissing);
        } else if (current.nodeType === Node.ELEMENT_NODE) {
          processElementAttributes(current as Element, targetLang, enqueueMissing);
        }
        current = walker.nextNode();
      }
    };

    scanAndTranslateSubtree(document.body, lang, true);

    const observer = new MutationObserver(mutations => {
      for (const m of mutations) {
        if (m.type === 'characterData' && m.target.nodeType === Node.TEXT_NODE) {
          processTextNode(m.target as Text, lang, true);
        } else if (m.type === 'childList') {
          m.addedNodes.forEach(added => scanAndTranslateSubtree(added, lang, true));
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      isDisposed = true;
      observer.disconnect();
      if (flushTimerRef.current !== null) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
    };
  }, [lang]);

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
      return `${formatted} ${langInfo.currencySymbol}`;
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
      if (!name) return '';
      if (lang === 'ar') {
        const key = slug || ARABIC_CATEGORY_SLUG_MAP[name.trim()];
        if (key && translations.ar[`cat.${key}`]) {
          return translations.ar[`cat.${key}`]!;
        }
        return name;
      }
      const key = slug || ARABIC_CATEGORY_SLUG_MAP[name.trim()];
      if (key && translations[lang]?.[`cat.${key}`]) {
        return translations[lang][`cat.${key}`]!;
      }
      return translateInstant(name, lang) || name;
    },
    [lang]
  );

  const translateProductName = useCallback(
    (name: string): string => {
      if (!name || lang === 'ar') return name;
      const entry = PRODUCT_NAME_TRANSLATIONS[name.trim()];
      if (entry) return entry[lang] || entry.en || name;
      return translateInstant(name, lang) || name;
    },
    [lang]
  );

  const translateStoreName = useCallback(
    (name: string): string => {
      if (!name || lang === 'ar') return name;
      const entry = STORE_NAME_TRANSLATIONS[name.trim()];
      if (entry) return entry[lang] || entry.en || name;
      return translateInstant(name, lang) || name;
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
      translateProductName,
      translateStoreName,
      translateStatus,
    }),
    [lang, langInfo, setLang, t, formatPrice, formatNumber, translateCategory, translateProductName, translateStoreName, translateStatus]
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
