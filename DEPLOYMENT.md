# دليل النشر والأمان (Deployment & Security Guide)

يحتوي هذا الملف على التعليمات اللازمة لإدارة النسخ الاحتياطي، وإعداد الدومين، وقائمة بمهام الأمان التي يجب عليك تنفيذها بنفسك.

## 1. إعداد دومين مخصص وتفعيل شهادة SSL / HTTPS

تمت تهيئة الكود بالكامل ليكون جاهزاً للعمل تحت تشفير **HTTPS** وشهادات **SSL**:
- **تحويل إجباري إلى HTTPS**: عند تشغيل السيرفر في الإنتاج، يتم تحويل أي طلب `http://` تلقائياً إلى `https://` بكود `301`.
- **دعم Let's Encrypt ACME**: مسار التحقق `/.well-known/acme-challenge/*` مفعل وجاهز لاستقبال طلبات Certbot دون أي عائق.
- **ترويسة HSTS**: مدمجة لحماية الموقع من هجمات Downgrade Attacks.
- **كوكيز مشفرة**: كافة كوكيز تسجيل الدخول (`accessToken`, `refreshToken`) تأخذ علامة `Secure` تلقائياً لمنع إرسالها عبر اتصالات غير مشفرة.

---

### الخيار (أ): التفعيل التلقائي عبر Railway (الموصى به حالياً)
بما أن المشروع مستضاف على Railway:
1. **شراء الدومين**: من أي مزود (مثل Namecheap, GoDaddy, Hostinger, Cloudflare).
2. **إضافة الدومين في Railway**:
   - افتح لوحة تحكم مشروعك في Railway -> اذهب إلى خدمة التطبيق (Service Settings).
   - انقر على **Settings** -> توجه إلى قسم **Domains** -> انقر **Custom Domain**.
   - أدخل الدومين الخاص بك (مثلاً `my-store.com` أو `api.my-store.com`).
3. **تحديث سجلات DNS**:
   - ستعطيك Railway سجل CNAME أو A Record مخصصاً.
   - أضف هذا السجل في لوحة تحكم الـ DNS الخاصة بدومينك.
4. **شهادة SSL مجانية وتلقائية**:
   - خلال 2 إلى 5 دقائق بعد التحقق من الـ DNS، تصدر Railway شهادة Let's Encrypt رسمية صالحة ومجددة ذاتياً دون أي تدخل يدوي.

---

### الخيار (ب): عبر شبكة Cloudflare (حماية مجانية وسرعة فائقة + SSL)
1. قم بربط دومينك بـ Cloudflare وتغيير الـ Nameservers.
2. في لوحة تحكم Cloudflare، اذهب إلى تبويب **SSL/TLS**:
   - اختر وضع التشفير: **Full** أو **Full (strict)**.
   - فعّل خيار **Always Use HTTPS** وخيار **Automatic HTTPS Rewrites**.
3. ستوفر لك Cloudflare شهادة Universal SSL مجانية تغطي دومينك ونطاقاته الفرعية (`*.your-store.com`).

---

### الخيار (ج): سيرفر خاص VPS (Ubuntu / Debian) مع Nginx و Certbot
إذا قمت بنقل المشروع إلى سيرفر VPS خاص بك، تم تجهيز ملف تهيئة كامل للمشروع في:
`[nginx/marketplace.conf](file:///d:/All_Projects_Organized/projects/new-project/nginx/marketplace.conf)`

**خطوات التثبيت على السيرفر**:
1. تثبيت Nginx و Certbot:
   ```bash
   sudo apt update
   sudo apt install nginx certbot python3-certbot-nginx -y
   ```
2. نسخ ملف الإعدادات واستبدال `example.com` باسم دومينك الحقيقي:
   ```bash
   sudo cp nginx/marketplace.conf /etc/nginx/sites-available/marketplace.conf
   sudo sed -i 's/example.com/your-store.com/g' /etc/nginx/sites-available/marketplace.conf
   sudo ln -s /etc/nginx/sites-available/marketplace.conf /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```
3. إصدار الشهادة مجاناً بضغطة زر عبر Certbot:
   ```bash
   sudo certbot --nginx -d your-store.com -d www.your-store.com
   ```
4. سيقوم Certbot بإصدار الشهادة وتثبيتها تلقائياً وتفعيل التجديد التلقائي الدائم كل 3 أشهر!

---

### تذكير هام بعد تفعيل الدومين و SSL:
قم بتحديث متغير `CORS_ORIGIN` في المتغيرات البيئية (Environment Variables) ليكون:
```env
CORS_ORIGIN=https://your-store.com
```
*(احرص على أن يبدأ بـ `https://`)*.

## 2. إدارة النسخ الاحتياطي التلقائي (Automated Backups)
لقد تم تجهيز نظام نسخ احتياطي تلقائي مستقل تماماً عن Railway.

- **الآلية**: يعمل النسخ الاحتياطي يومياً عبر **GitHub Actions** في تمام الساعة 2:00 صباحاً (UTC).
- **التخزين**: تُرفع النسخ إلى مساحة تخزين متوافقة مع S3 (مثل Cloudflare R2 أو Backblaze B2).
- **الاحتفاظ بالنسخ (Retention Policy)**: يتم الاحتفاظ بالنسخ اليومية لمدة 30 يوماً، والنسخ الأسبوعية لمدة 90 يوماً.

### إعداد المتغيرات لـ GitHub Actions
لكي يعمل النسخ التلقائي، يجب أن تذهب إلى إعدادات المستودع في GitHub:
`Settings -> Secrets and variables -> Actions`
ثم أضف المتغيرات التالية:
- `DATABASE_URL`: رابط قاعدة البيانات المباشر (مثل الموجود في Railway).
- `S3_ENDPOINT`: رابط الـ API الخاص بـ S3 (مثل `https://<account_id>.r2.cloudflarestorage.com`).
- `S3_BUCKET`: اسم الـ Bucket.
- `S3_REGION`: المنطقة (غالباً `auto` لـ Cloudflare).
- `S3_ACCESS_KEY`: مفتاح الوصول السري (Access Key).
- `S3_SECRET_KEY`: مفتاح المرور السري (Secret Key).

---

## 3. استعادة النسخ الاحتياطية (Disaster Recovery)
في حالة حدوث كارثة (فقدان البيانات أو حذف قاعدة البيانات بالخطأ)، لا تعتمد على النسخ الداخلي فقط، يمكنك الاستعادة من النسخ المرفوعة إلى S3 باتباع التالي:

1. **تحميل النسخة الاحتياطية**:
   قم بتحميل أحدث ملف نسخة احتياطية من لوحة تحكم Cloudflare R2 (أو B2). اسم الملف سيكون بصيغة `backup-daily-YYYY-MM-DD.sql.gz`.

2. **فك ضغط النسخة**:
   في جهازك المحلي (عبر الطرفية):
   ```bash
   gunzip backup-daily-YYYY-MM-DD.sql.gz
   ```
   سينتج لك ملف `backup-daily-YYYY-MM-DD.sql`.

3. **استعادة البيانات إلى قاعدة البيانات**:
   تأكد من وجود قاعدة بيانات فارغة ومستعدة للاستعادة، ثم استخدم أداة `psql` أو `pg_restore`:
   ```bash
   psql -d "postgres://USER:PASSWORD@HOST:PORT/DATABASE_NAME" -f backup-daily-YYYY-MM-DD.sql
   ```
   *(استبدل الرابط برابط قاعدة البيانات الجديدة الخاصة بك في Railway).*

---

## 4. ⚠️ مهام الأمان البشرية (إلزامي للإنتاج)
بصفتك المالك للمشروع، هذه الخطوات لا يمكن للذكاء الاصطناعي تنفيذها بدلاً عنك. **يجب عليك تنفيذها فوراً**:

- [ ] **المصادقة الثنائية في Railway**: قم بتفعيل المصادقة الثنائية (2FA) لحسابك في لوحة تحكم Railway لمنع سرقة الحساب وحذف المشروع.
- [ ] **المصادقة الثنائية في GitHub**: تأكد من تفعيل الـ 2FA في حسابك على GitHub، لأن من يمتلك الكود يمتلك صلاحيات التأثير على الإنتاج.
- [ ] **مراجعة صلاحيات الوصول**: تأكد من أن المطورين الحاليين فقط هم من يمتلكون صلاحية (Write/Admin) على المستودع في GitHub وعلى مشروع Railway.
- [ ] **حماية المتغيرات الحساسة**: احتفظ بنسخة من مفاتيح `PAYMOB_HMAC` و `JWT_ACCESS_SECRET` و `JWT_REFRESH_SECRET` في مدير كلمات مرور آمن (مثل 1Password أو Bitwarden) ולא في ملف نصي على جهازك.
- [ ] **بيئة التشغيل (Environment Variables)**: تأكد من أنك لم تضع أي كلمات مرور أو مفاتيح سرية في ملف `.env` وقم بإزالتها إذا وجدت، وضعها جميعاً فقط في قسم Environment Variables داخل Railway.
