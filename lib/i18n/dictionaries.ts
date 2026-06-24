import type { Locale } from './config';

// UI strings only — product content is translated via product_translations.
const en = {
  nav: { home: 'Home', cart: 'Cart', categories: 'Categories', menu: 'Menu', services: 'Repairs & Services', account: 'Account', trackRepair: 'Track repair' },
  hero: {
    eyebrow: 'Genuine stock · Official warranties',
    title1: 'Nokia & mobile phones you want.',
    title2: 'Delivered islandwide.',
    sub: 'Nokia phones, audio and smart gear at honest prices — order online, pay securely, or just ask us on WhatsApp like always.',
    shopNow: 'Shop now',
    askWhatsApp: 'Ask on WhatsApp'
  },
  home: {
    announce: 'Free islandwide delivery & official warranties — order online or on WhatsApp.',
    catTitle: 'Shop by category', catSub: 'Everything you need, sorted the way you actually think.',
    trendTitle: 'Trending now', trendSub: "What everyone's adding to cart this week.",
    seeAll: 'View all', allCats: 'All categories',
    spotEyebrow: 'Featured', spotCta: 'View product', from: 'From',
    promoTitle: 'Repairs, done right.', promoSub: 'Cracked screen or weak battery? Trusted technicians, WhatsApp updates every step.',
    ctaTitle: 'Questions? Talk to a human.', ctaSub: 'New arrivals, honest advice and order help — message us on WhatsApp anytime.',
    ctaBtn: 'Chat on WhatsApp', items: 'items'
  },
  trust: {
    warranty: 'Official warranty', warrantysub: 'Agent-backed, every item',
    courier: 'Islandwide courier', couriersub: 'Colombo & outstation',
    whatsapp: 'WhatsApp support', whatsappsub: 'A real human replies',
    payment: 'Secure payment', paymentsub: 'Cards · PayHere'
  },
  sections: { featured: 'Fresh in stock', browse: 'Browse by category', related: 'Pairs well with', all: 'All products', popular: 'Popular right now.', reviews: 'Customer reviews', writeReview: 'Write a review', goesWith: 'Goes well with your cart' },
  services: {
    eyebrow: 'Repairs & Services', homeTitle: 'Cracked screen?\nWe\'ve got you.', homeSub: 'Phone and device repairs by trusted technicians. Drop it off, and we\'ll keep you posted on WhatsApp every step.',
    bookCta: 'Book a repair', trackCta: 'Track my repair',
    t1: 'Screen replacement', t2: 'Battery swap', t3: 'Charging port', t4: 'Software & setup',
    title: 'Book a repair', sub: 'Tell us about your device and the issue. We\'ll confirm a quote on WhatsApp.',
    device: 'Device (brand & model)', type: 'Service needed', issue: 'Describe the issue',
    submit: 'Request repair', submitted: 'Repair request received!', submittedSub: 'We\'ll message you on WhatsApp shortly with the next steps. Save your reference number:',
    trackTitle: 'Track your repair', trackSub: 'Enter your job number and the last 4 digits of your phone.',
    jobNo: 'Job number (SRV-…)', last4: 'Last 4 digits of phone', track: 'Track', notFound: 'No repair found with those details.'
  },
  pay: {
    method: 'How would you like to pay?',
    online: 'Card / online', onlineSub: 'Visa, Mastercard, eZ Cash via PayHere',
    cod: 'Cash on delivery', codSub: 'Pay when your order arrives',
    whatsapp: 'Order on WhatsApp', whatsappSub: 'Confirm & pay with us on chat',
    placeOrder: 'Place order', sendWhatsApp: 'Send order on WhatsApp',
    placed: 'Order placed!', placedSub: 'We\'ll confirm on WhatsApp and arrange delivery. Your order number:',
    waMsgIntro: 'Hi! I\'d like to place this order:',
    fulfil: 'How will you get it?', deliver: 'Deliver to me', pickup: 'Pick up in store',
    pickupSub: 'Collect at our shop — no delivery fee', deliverSub: 'Islandwide courier', payAtStore: 'Pay at store',
  },
  search: {
    placeholder: 'Search phones, audio, accessories…', go: 'Search', prompt: 'Type to search our catalogue.',
    noResults: 'No products found for', results: 'results', relevance: 'Relevance',
    priceLow: 'Price: low to high', priceHigh: 'Price: high to low', topRated: 'Top rated',
    filters: 'Filters', clear: 'Clear', allBrands: 'All brands', minPrice: 'Min Rs', maxPrice: 'Max Rs', inStock: 'In stock only'
  },
  warranty: {
    title: 'Warranty check', sub: 'Enter your serial / IMEI, or the last 4 digits of your phone.',
    serial: 'Serial / IMEI', last4: 'Last 4 digits of phone', check: 'Check warranty',
    none: 'No warranty found for those details.', active: 'Active', expired: 'Expired',
    expires: 'Valid until', purchased: 'Purchased'
  },
  returns: {
    title: 'Request a return', sub: 'Enter your order number and phone. We\'ll review and reply on WhatsApp.',
    orderNo: 'Order number (ORD-…)', phone: 'Phone on the order', reason: 'Why are you returning it?',
    submit: 'Request return', done: 'Return requested!', doneSub: 'We\'ll review and message you on WhatsApp. Your RMA number:',
    notFound: 'No matching delivered order found for those details.'
  },
  product: {
    addToCart: 'Add to cart', added: 'Added ✓', outOfStock: 'Out of stock',
    inStock: 'In stock', lowStock: 'left in stock', specs: 'Specifications',
    askProduct: 'Ask about this on WhatsApp', sku: 'SKU', warranty: 'Warranty',
    chooseVariant: 'Choose option', save: 'Save'
  },
  cart: {
    title: 'Your cart', empty: 'Your cart is empty.', emptyCta: 'Browse products',
    subtotal: 'Subtotal', delivery: 'Delivery', total: 'Total',
    deliveryZone: 'Delivery area', checkout: 'Checkout securely',
    remove: 'Remove', couponSoon: 'Coupon codes activate at checkout',
    continueShopping: 'Continue shopping'
  },
  checkout: {
    title: 'Checkout', soon: 'Online payment goes live in the next release.',
    meanwhile: 'For now, send your cart to us on WhatsApp and we will confirm your order right away.',
    sendWhatsApp: 'Send order via WhatsApp', back: 'Back to cart'
  },
  form: {
    name: 'Full name', phone: 'Phone (WhatsApp)', address: 'Address', city: 'City',
    coupon: 'Coupon code', apply: 'Apply', applied: 'applied',
    pay: 'Pay securely with PayHere', placing: 'Placing order…',
    stockErr: 'Sorry, an item just sold out. Please review your cart.',
    loginNeeded: 'Sign in to complete your order', secure: 'Verified server-side · Visa · Master · eZ Cash'
  },
  account: {
    title: 'My account', orders: 'My orders', none: 'No orders yet.',
    signOut: 'Sign out', signIn: 'Sign in', signUp: 'Create account',
    email: 'Email', password: 'Password',
    toSignup: 'New here? Create an account', toSignin: 'Have an account? Sign in',
    google: 'Continue with Google', view: 'View', notConfigured: 'Accounts activate once the store is connected to Supabase.'
  },
  status: {
    pending: 'Pending', paid: 'Paid', packed: 'Packed', shipped: 'Shipped',
    delivered: 'Delivered', cancelled: 'Cancelled', refunded: 'Refunded'
  },
  order: {
    thanks: 'Order received!', confirming: 'Confirming your payment…',
    number: 'Order', timeline: 'Order status', items: 'Items', total: 'Total',
    help: 'Questions about this order? Message us on WhatsApp.'
  },
  footer: { rights: 'All rights reserved.', built: 'Genuine electronics, fair prices, fast delivery.' },
  badge: { sale: 'SALE' }
};

const si: typeof en = {
  nav: { home: 'Home', cart: 'Cart', categories: 'Categories', menu: 'Menu', services: 'Repairs & Services', account: 'Account', trackRepair: 'Track Repair' },
  hero: {
    eyebrow: 'සැබෑ භාණ්ඩ · නිල වගකීම් සහිතයි',
    title1: 'ඔබට අවශ්‍ය Gadgets.',
    title2: 'දිවයින පුරා Delivery.',
    sub: 'Phones, audio සහ smart උපාංග සාධාරණ මිලට — online order කරන්න, ආරක්ෂිතව ගෙවන්න, නැත්නම් WhatsApp හරහා අපට කතා කරන්න.',
    shopNow: 'දැන්ම මිලදී ගන්න',
    askWhatsApp: 'WhatsApp හරහා අහන්න'
  },
  home: {
    announce: 'දිවයින පුරා නොමිලේ Delivery සහ නිල වගකීම් — online හෝ WhatsApp හරහා order කරන්න.',
    catTitle: 'Category අනුව බලන්න', catSub: 'ඔබට අවශ්‍ය සියල්ල, ඔබට අවශ්‍ය ලෙසම.',
    trendTitle: 'දැන් ජනප්‍රිය', trendSub: 'මේ සතියේ වැඩිපුරම අලෙවි වන උපාංග.',
    seeAll: 'සියල්ල බලන්න', allCats: 'සියලුම Categories',
    spotEyebrow: 'විශේෂාංග', spotCta: 'Product එක බලන්න', from: 'සිට',
    promoTitle: 'Repairs, done right.', promoSub: 'Cracked screen or weak battery? Trusted technicians, WhatsApp updates every step.',
    ctaTitle: 'ප්‍රශ්න තිබේද? අපට කතා කරන්න.', ctaSub: 'New arrivals, අවංක උපදෙස් සහ orders පිළිබඳ සහාය සඳහා — ඕනෑම වේලාවක WhatsApp හරහා අපට පණිවිඩයක් එවන්න.',
    ctaBtn: 'WhatsApp හරහා කතා කරන්න', items: 'items'
  },
  trust: {
    warranty: 'Official warranty', warrantysub: 'Agent-backed, every item',
    courier: 'Islandwide courier', couriersub: 'Colombo & outstation',
    whatsapp: 'WhatsApp support', whatsappsub: 'A real human replies',
    payment: 'Secure payment', paymentsub: 'Cards · PayHere'
  },
  sections: { featured: 'New Arrivals', browse: 'Category අනුව බලන්න', related: 'අදාළ Products', all: 'සියලුම Products', popular: 'දැන් ජනප්‍රියයි', reviews: 'Customer Reviews', writeReview: 'Review එකක් ලියන්න', goesWith: 'ඔබේ කරත්තයට ගැලපේ' },
  services: {
    eyebrow: 'Repairs & Services', homeTitle: 'Screen එක කැඩිලාද?\nඅපි එය හදලා දෙන්නම්.', homeSub: 'විශ්වාසනීය කාර්මිකයන් අතින් දුරකථන සහ උපාංග repairs. භාර දෙන්න, සෑම පියවරක්ම WhatsApp හරහා අපි ඔබව දැනුවත් කරනවා.',
    bookCta: 'Book a repair', trackCta: 'Track my repair',
    t1: 'Screen Replacement', t2: 'Battery Swap', t3: 'Charging port', t4: 'Software සහ Settings',
    title: 'Repair එකක් දාන්න', sub: 'Device එක සහ ගැටලුව පිළිබඳව අපට පවසන්න. අපි WhatsApp හරහා මිල ගණන් confirm කරන්නෙමු.',
    device: 'Device එක (Brand සහ Model)', type: 'අවශ්‍ය සේවාව', issue: 'ගැටලුව විස්තර කරන්න',
    submit: 'Repair එක ඉල්ලන්න', submitted: 'ඉල්ලීම ලැබුණා!', submittedSub: 'ඊළඟ පියවර පිළිබඳව අපි ඉක්මනින් WhatsApp හරහා ඔබට දැනුම් දෙන්නෙමු. කරුණාකර ඔබගේ reference number එක සුරකින්න:',
    trackTitle: 'ඔබගේ Repair එක Track කරන්න', trackSub: 'ඔබගේ Job number එක සහ phone නම්බර් එකේ අවසන් අංක 4 ඇතුළත් කරන්න.',
    jobNo: 'Job number එක (SRV-…)', last4: 'Phone එකේ අවසන් අංක 4', track: 'Track කරන්න', notFound: 'එම විස්තර සහිත repair එකක් හමු නොවීය.'
  },
  pay: {
    method: 'ඔබ ගෙවීම කරන්නේ කෙසේද?',
    online: 'Card / Online', onlineSub: 'Visa, Mastercard, eZ Cash PayHere හරහා',
    cod: 'Cash on Delivery', codSub: 'ඔබේ order එක ලැබුණු විට ගෙවන්න',
    whatsapp: 'WhatsApp හරහා Order කරන්න', whatsappSub: 'අප හා කතා කර order එක confirm කර ගෙවන්න',
    placeOrder: 'Order එක තබන්න', sendWhatsApp: 'WhatsApp හරහා Order එක යවන්න',
    placed: 'Order එක සාර්ථකයි!', placedSub: 'අපි WhatsApp හරහා confirm කර delivery එක සංවිධානය කරන්නෙමු. ඔබේ Order අංකය:',
    waMsgIntro: 'ආයුබෝවන්! මට මෙම order එක ලබා දීමට අවශ්‍යයි:',
    fulfil: 'ඔබට භාණ්ඩය ලැබිය යුත්තේ කෙසේද?', deliver: 'Delivery කරන්න', pickup: 'Store එකෙන් ගන්න',
    pickupSub: 'අපගේ වෙළඳසැලෙන් එකතු කරගන්න — delivery ගාස්තු නොමැත', deliverSub: 'දිවයින පුරා Courier සේවාව', payAtStore: 'Store එකේදී ගෙවන්න',
  },
  search: {
    placeholder: 'Phones, audio සහ උපාංග සොයන්න…', go: 'සොයන්න', prompt: 'Search කිරීම සඳහා ටයිප් කරන්න.',
    noResults: 'සඳහා ප්‍රතිඵල හමු නොවීය', results: 'ප්‍රතිඵල', relevance: 'අදාළත්වය',
    priceLow: 'මිල: අඩු සිට වැඩි', priceHigh: 'මිල: වැඩි සිට අඩු', topRated: 'Top Rated',
    filters: 'Filters', clear: 'Clear', allBrands: 'සියලුම Brands', minPrice: 'අවම රු.', maxPrice: 'උපරිම රු.', inStock: 'In stock පමණි'
  },
  warranty: {
    title: 'Warranty check', sub: 'Enter your serial / IMEI, or the last 4 digits of your phone.',
    serial: 'Serial / IMEI', last4: 'Last 4 digits of phone', check: 'Check warranty',
    none: 'No warranty found for those details.', active: 'Active', expired: 'Expired',
    expires: 'Valid until', purchased: 'Purchased'
  },
  returns: {
    title: 'Return Request එකක්', sub: 'ඔබගේ Order අංකය සහ Phone අංකය ඇතුළත් කරන්න. අපි එය බලලා WhatsApp හරහා පිළිතුරු දෙන්නෙමු.',
    orderNo: 'Order අංකය (ORD-…)', phone: 'දුරකථන අංකය', reason: 'ඔබ භාණ්ඩය ආපසු ලබා දෙන්නේ ඇයි?',
    submit: 'Request Return', done: 'Return එක සාර්ථකයි!', doneSub: 'අපි එය බලලා WhatsApp හරහා ඔබව දැනුවත් කරන්නෙමු. ඔබේ RMA අංකය:',
    notFound: 'එම විස්තර සඳහා ලබා දුන් order එකක් හමු නොවීය.'
  },
  product: {
    addToCart: 'Add to Cart', added: 'Added ✓', outOfStock: 'Out of Stock',
    inStock: 'In Stock', lowStock: 'ක් පමණක් ඉතිරිව ඇත', specs: 'Specifications',
    askProduct: 'මේ ගැන WhatsApp හරහා අහන්න', sku: 'SKU', warranty: 'Warranty',
    chooseVariant: 'විකල්පයක් තෝරන්න', save: 'ඉතිරිය'
  },
  cart: {
    title: 'ඔබේ කරත්තය', empty: 'ඔබගේ කරත්තය හිස්ය.', emptyCta: 'Products බලන්න',
    subtotal: 'Subtotal', delivery: 'Delivery ගාස්තුව', total: 'Total එක',
    deliveryZone: 'Delivery ප්‍රදේශය', checkout: 'ආරක්ෂිතව Checkout කරන්න',
    remove: 'Remove', couponSoon: 'Checkout පිටුවේදී Coupon කේත භාවිතා කළ හැක',
    continueShopping: 'තවදුරටත් බලන්න'
  },
  checkout: {
    title: 'Checkout පිටුව', soon: 'Online Payments ඊළඟ යාවත්කාලීන කිරීමේදී සක්‍රිය වේ.',
    meanwhile: 'දැනට ඔබගේ order එක WhatsApp හරහා අපට එවන්න — අපි වහාම තහවුරු කරන්නෙමු.',
    sendWhatsApp: 'WhatsApp හරහා Order එක යවන්න', back: 'නැවත කරත්තය වෙත'
  },
  form: {
    name: 'සම්පූර්ණ නම', phone: 'Phone අංකය (WhatsApp)', address: 'ලිපිනය', city: 'නගරය',
    coupon: 'Coupon Code', apply: 'Apply', applied: 'Applied',
    pay: 'PayHere හරහා ආරක්ෂිතව ගෙවන්න', placing: 'Order එක සකසමින් පවතී…',
    stockErr: 'කණගාටුයි, අයිතමයක තොග අවසන් වී ඇත. කරුණාකර ඔබගේ කරත්තය පරීක්ෂා කරන්න.',
    loginNeeded: 'ඔබගේ order එක සම්පූර්ණ කිරීමට Login වන්න', secure: 'Verified · Visa · Master · eZ Cash'
  },
  account: {
    title: 'මගේ ගිණුම', orders: 'මගේ Orders', none: 'තවමත් orders නොමැත.',
    signOut: 'Sign out', signIn: 'Sign in', signUp: 'ගිණුමක් සාදන්න',
    email: 'Email', password: 'Password',
    toSignup: 'ගිණුමක් නොමැතිද? නව ගිණුමක් සාදන්න', toSignin: 'ගිණුමක් තිබේද? Sign in වන්න',
    google: 'Google හරහා Sign in වන්න', view: 'View', notConfigured: 'Supabase සම්බන්ධ වූ පසු ගිණුම් සක්‍රිය වේ.'
  },
  status: {
    pending: 'Pending', paid: 'Paid', packed: 'Packed', shipped: 'Shipped',
    delivered: 'Delivered', cancelled: 'Cancelled', refunded: 'Refunded'
  },
  order: {
    thanks: 'ඔබගේ Order එක ලැබුණා!', confirming: 'ඔබගේ payment එක තහවුරු කරමින් පවතී…',
    number: 'Order අංකය', timeline: 'Order Status', items: 'Items', total: 'Total එක',
    help: 'මෙම order එක පිළිබඳව ප්‍රශ්න තිබේද? WhatsApp හරහා අපට පණිවිඩයක් එවන්න.'
  },
  footer: { rights: 'All rights reserved.', built: 'සැබෑ ඉලෙක්ට්‍රොනික උපාංග, සාධාරණ මිල, වේගවත් delivery.' },
  badge: { sale: 'SALE' }
};

const ta: typeof en = {
  nav: { home: 'Home', cart: 'Cart', categories: 'Categories', menu: 'Menu', services: 'Repairs & Services', account: 'Account', trackRepair: 'Track Repair' },
  hero: {
    eyebrow: 'அசல் பொருட்கள் · அதிகாரப்பூர்வ Warranty',
    title1: 'உங்களுக்கு வேண்டிய Gadgets.',
    title2: 'நாடு முழுவதும் Delivery.',
    sub: 'Phones, audio மற்றும் smart சாதனங்கள் நியாயமான விலையில் — online order செய்யுங்கள், பாதுகாப்பாக பணம் செலுத்துங்கள், அல்லது WhatsApp-ல் கேளுங்கள்.',
    shopNow: 'இப்போது வாங்க',
    askWhatsApp: 'WhatsApp-ல் கேளுங்கள்'
  },
  home: {
    announce: 'நாடு முழுவதும் இலவச Delivery மற்றும் அதிகாரப்பூர்வ Warranty — online அல்லது WhatsApp-ல் order செய்யுங்கள்.',
    catTitle: 'Category வாரியாக பாருங்கள்', catSub: 'உங்களுக்குத் தேவையான அனைத்தும், உங்களுக்கு வேண்டியபடியே.',
    trendTitle: 'இப்போது பிரபலம்', trendSub: 'இந்த வாரம் அனைவரும் Cart-ல் சேர்ப்பது.',
    seeAll: 'அனைத்தையும் காண்க', allCats: 'அனைத்து Categories',
    spotEyebrow: 'சிறப்பு', spotCta: 'Product-ஐ காண்க', from: 'இருந்து',
    promoTitle: 'Repairs, done right.', promoSub: 'Cracked screen or weak battery? Trusted technicians, WhatsApp updates every step.',
    ctaTitle: 'கேள்விகள் உள்ளதா? எங்களிடம் பேசுங்கள்.', ctaSub: 'New arrivals, நேர்மையான ஆலோசனை மற்றும் orders உதவிக்கு — எப்போது வேண்டுமானாலும் WhatsApp-ல் தொடர்பு கொள்ளுங்கள்.',
    ctaBtn: 'WhatsApp-ல் பேசுங்கள்', items: 'items'
  },
  trust: {
    warranty: 'Official warranty', warrantysub: 'Agent-backed, every item',
    courier: 'Islandwide courier', couriersub: 'Colombo & outstation',
    whatsapp: 'WhatsApp support', whatsappsub: 'A real human replies',
    payment: 'Secure payment', paymentsub: 'Cards · PayHere'
  },
  sections: { featured: 'New Arrivals', browse: 'Category வாரியாக பாருங்கள்', related: 'இதனுடன் பொருந்தும்', all: 'அனைத்து Products', popular: 'இப்போது பிரபலம்.', reviews: 'Customer Reviews', writeReview: 'Review எழுதுங்கள்', goesWith: 'உங்கள் Cart-க்கு ஏற்றது' },
  services: {
    eyebrow: 'Repairs & Services', homeTitle: 'Screen உடைந்ததா?\nநாங்கள் சரிசெய்கிறோம்.', homeSub: 'நம்பகமான தொழில்நுட்ப வல்லுநர்களால் சாதன repairs. கொடுங்கள், ஒவ்வொரு படியையும் WhatsApp-ல் தெரிவிப்போம்.',
    bookCta: 'Book a repair', trackCta: 'Track my repair',
    t1: 'Screen Replacement', t2: 'Battery Swap', t3: 'Charging port', t4: 'Software & Settings',
    title: 'Repair-ஐ பதிவு செய்', sub: 'உங்கள் Device மற்றும் சிக்கலைப் பற்றி சொல்லுங்கள். WhatsApp-ல் விலையை confirm செய்வோம்.',
    device: 'Device (Brand & Model)', type: 'தேவையான சேவை', issue: 'சிக்கலை விவரிக்கவும்',
    submit: 'Repair கோரிக்கை', submitted: 'கோரிக்கை பெறப்பட்டது!', submittedSub: 'அடுத்த படிகள் குறித்து விரைவில் WhatsApp-ல் தெரிவிப்போம். உங்கள் reference எண்ணைச் சேமிக்கவும்:',
    trackTitle: 'உங்கள் Repair-ஐ Track செய்', trackSub: 'Job எண் மற்றும் தொலைபேசியின் கடைசி 4 இலக்கங்களை உள்ளிடவும்.',
    jobNo: 'Job எண் (SRV-…)', last4: 'தொலைபேசியின் கடைசி 4 இலக்கம்', track: 'Track செய்', notFound: 'அந்த விவரங்களுடன் repair எதுவும் கிடைக்கவில்லை.'
  },
  pay: {
    method: 'எப்படி பணம் செலுத்த விரும்புகிறீர்கள்?',
    online: 'Card / Online', onlineSub: 'PayHere மூலம் Visa, Mastercard, eZ Cash',
    cod: 'Cash on Delivery', codSub: 'உங்கள் order வந்ததும் பணம் செலுத்துங்கள்',
    whatsapp: 'WhatsApp-ல் Order', whatsappSub: 'எங்களிடம் confirm செய்து பணம் செலுத்துங்கள்',
    placeOrder: 'Order செய்யுங்கள்', sendWhatsApp: 'WhatsApp-ல் Order அனுப்பு',
    placed: 'Order வெற்றிகரமானது!', placedSub: 'நாங்கள் WhatsApp-ல் confirm செய்து delivery ஏற்பாடு செய்வோம். உங்கள் Order எண்:',
    waMsgIntro: 'வணக்கம்! இந்த order-ஐ செய்ய விரும்புகிறேன்:',
    fulfil: 'எப்படி பெறுவீர்கள்?', deliver: 'Delivery செய்', pickup: 'Store-ல் பெறு',
    pickupSub: 'எங்கள் Store-ல் சேகரிக்கவும் — delivery கட்டணம் இல்லை', deliverSub: 'நாடு முழுவதும் Courier', payAtStore: 'Store-ல் பணம் செலுத்து',
  },
  search: {
    placeholder: 'Phones, audio, accessories தேடு…', go: 'தேடு', prompt: 'Search செய்ய type செய்யவும்.',
    noResults: 'இதற்கு முடிவுகள் கிடைக்கவில்லை:', results: 'முடிவுகள்', relevance: 'பொருத்தம்',
    priceLow: 'விலை: குறைவு முதல் அதிகம்', priceHigh: 'விலை: அதிகம் முதல் குறைவு', topRated: 'Top Rated',
    filters: 'Filters', clear: 'Clear', allBrands: 'அனைத்து Brands', minPrice: 'குறைந்த Rs.', maxPrice: 'அதிக Rs.', inStock: 'In stock மட்டும்'
  },
  warranty: {
    title: 'Warranty check', sub: 'Enter your serial / IMEI, or the last 4 digits of your phone.',
    serial: 'Serial / IMEI', last4: 'Last 4 digits of phone', check: 'Check warranty',
    none: 'No warranty found for those details.', active: 'Active', expired: 'Expired',
    expires: 'Valid until', purchased: 'Purchased'
  },
  returns: {
    title: 'Return Request', sub: 'ஆர்டர் எண் மற்றும் தொலைபேசியை உள்ளிடவும். WhatsApp-ல் பதிலளிப்போம்.',
    orderNo: 'Order எண் (ORD-…)', phone: 'தொலைபேசி எண்', reason: 'ஏன் return செய்கிறீர்கள்?',
    submit: 'Request Return', done: 'Return கோரிக்கை பெறப்பட்டது!', doneSub: 'நாங்கள் மதிப்பாய்வு செய்து WhatsApp-ல் தெரிவிப்போம். உங்கள் RMA எண்:',
    notFound: 'அந்த விவரங்களுக்கு வழங்கப்பட்ட order இல்லை.'
  },
  product: {
    addToCart: 'Add to Cart', added: 'Added ✓', outOfStock: 'Out of Stock',
    inStock: 'In Stock', lowStock: 'மட்டுமே உள்ளது', specs: 'Specifications',
    askProduct: 'இதைப் பற்றி WhatsApp-ல் கேளுங்கள்', sku: 'SKU', warranty: 'Warranty',
    chooseVariant: 'விருப்பத்தைத் தேர்வு செய்க', save: 'சேமிப்பு'
  },
  cart: {
    title: 'உங்கள் Cart', empty: 'உங்கள் Cart காலியாக உள்ளது.', emptyCta: 'Products-ஐ பாருங்கள்',
    subtotal: 'Subtotal', delivery: 'Delivery கட்டணம்', total: 'Total',
    deliveryZone: 'Delivery பகுதி', checkout: 'பாதுகாப்பாக Checkout செய்',
    remove: 'Remove', couponSoon: 'Coupon குறியீடுகள் checkout-ல் பயன்படுத்தலாம்',
    continueShopping: 'தொடர்ந்து வாங்குங்கள்'
  },
  checkout: {
    title: 'Checkout', soon: 'Online Payments அடுத்த கட்டத்தில் செயல்படும்.',
    meanwhile: 'இப்போதைக்கு உங்கள் order-ஐ WhatsApp-ல் அனுப்புங்கள் — உடனே உறுதிப்படுத்துகிறோம்.',
    sendWhatsApp: 'WhatsApp வழியாக Order அனுப்பு', back: 'Cart-க்குத் திரும்பு'
  },
  form: {
    name: 'முழுப் பெயர்', phone: 'தொலைபேசி எண் (WhatsApp)', address: 'முகவரி', city: 'நகரம்',
    coupon: 'Coupon Code', apply: 'Apply', applied: 'Applied',
    pay: 'PayHere மூலம் பாதுகாப்பாக செலுத்துங்கள்', placing: 'Order உருவாக்கப்படுகிறது…',
    stockErr: 'மன்னிக்கவும், ஒரு பொருள் விற்றுத் தீர்ந்தது. உங்கள் Cart-ஐ மீண்டும் பாருங்கள்.',
    loginNeeded: 'உங்கள் order-ஐ முடிக்க Login செய்யவும்', secure: 'Verified · Visa · Master · eZ Cash'
  },
  account: {
    title: 'என் கணக்கு', orders: 'என் Orders', none: 'இன்னும் orders இல்லை.',
    signOut: 'Sign out', signIn: 'Sign in', signUp: 'Sign up',
    email: 'மின்னஞ்சல்', password: 'கடவுச்சொல்',
    toSignup: 'புதியவரா? Sign up செய்யுங்கள்', toSignin: 'கணக்கு உள்ளதா? Sign in செய்யுங்கள்',
    google: 'Google மூலம் Sign in செய்', view: 'View', notConfigured: 'Supabase இணைக்கப்பட்டதும் கணக்குகள் செயல்படும்.'
  },
  status: {
    pending: 'Pending', paid: 'Paid', packed: 'Packed', shipped: 'Shipped',
    delivered: 'Delivered', cancelled: 'Cancelled', refunded: 'Refunded'
  },
  order: {
    thanks: 'உங்கள் Order பெறப்பட்டது!', confirming: 'Payment உறுதிப்படுத்தப்படுகிறது…',
    number: 'Order எண்', timeline: 'Order Status', items: 'Items', total: 'Total',
    help: 'இந்த order பற்றி கேள்விகளா? WhatsApp-ல் எங்களை தொடர்பு கொள்ளுங்கள்.'
  },
  footer: { rights: 'All rights reserved.', built: 'அசல் electronics, நியாயமான விலை, விரைவான delivery.' },
  badge: { sale: 'SALE' }
};

const dictionaries = { en, si, ta };
export type Dict = typeof en;
export function getDict(locale: Locale): Dict {
  return dictionaries[locale] ?? en;
}
