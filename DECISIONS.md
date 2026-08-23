# DECISIONS.md — قرارات معمارية واجتهادية

هذا الملف يوثّق كل قرار اجتهادي غير محدد صراحة في البرومبت، مع سبب مختصر.

---

## F1 — سلامة البيانات (Data Integrity)

### قرار: الإشعارات خارج الـ Transaction

**القرار**: إشعارات البائعين عند إنشاء طلب جديد (POST /api/orders) تُرسَل **خارج** الـ `db.transaction()` كـ fire-and-forget بعد الـ commit مباشرة.

**السبب**: فشل الإشعار (مثلاً انقطاع مؤقت في DB) لا يجب أن يُلغي طلباً أُنشئ بنجاح. الإشعار side-effect غير حرجي، بينما الطلب هو البيانات الأساسية. عزل الـ side-effects عن الـ transaction الحرجة هو ممارسة قياسية في أنظمة التجارة.

---

### قرار: FOR UPDATE لقراءة orderItem داخل transaction الـ "delivered"

**القرار**: داخل transaction تحديث حالة عنصر الطلب إلى "delivered"، يُستخدم `.for('update')` (SELECT ... FOR UPDATE) لقفل الصف عند قراءته.

**السبب**: منع سيناريو race condition حيث يستقبل السيرفر طلبين متزامنين من نفس البائع لتسليم نفس العنصر، كلاهما يجتاز الفحص الأولي (pre-flight) ثم يحاول كتابة commission مرتين. الـ FOR UPDATE يضمن إن التاني سينتظر الأول ثم يكتشف إن الحالة تغيّرت.

---

### قرار: FOR UPDATE لقراءة vendor balance داخل transaction الـ commission

**القرار**: قراءة `vendors.totalSales` (balance) تتم داخل الـ transaction مع `.for('update')` لا خارجها.

**السبب**: لو قُرئ الـ balance خارج الـ transaction، قد يتغيّر بين القراءة والكتابة (transaction أخرى تُسوّي نفس البائع في نفس اللحظة)، مما يؤدي لـ `balance_before` خاطئ في جدول `transactions` (السجل المحاسبي). القراءة داخل نفس الـ transaction مع lock تضمن دقة السجل.

---

### قرار: الفحص الأولي (pre-flight) يبقى خارج الـ transaction

**القرار**: فحص المخزون والكوبون يحدث مرتين: مرة قبل الـ transaction (pre-flight لرسائل خطأ مبكرة) ومرة داخلها (البوابة الحقيقية).

**السبب**: الفحص خارج الـ transaction يُحسّن تجربة المستخدم — يُرجع رسالة واضحة ("المنتج غير متاح") بدون بدء transaction وrollback. الفحص داخل الـ transaction هو البوابة الأمنية الحقيقية التي تصمد أمام التزامن. الاثنان معاً يحققان أفضل النتيجتين.

---

### قرار: GREATEST() عند استعادة كوبون الإلغاء

**القرار**: عند إلغاء طلب فيه كوبون، يُستخدم `GREATEST(used_count - 1, 0)` بدل تخفيض مباشر.

**السبب**: حماية defensive — لو بسبب bug أو scenario حافة أصبح `used_count = 0` قبل الإلغاء، لا ينتج قيمة سالبة تكسر constraints مستقبلاً.

---

### قرار: حذف الإشعارات في checkout استُبقي خارج transaction

**القرار**: insertions في جدول `notifications` للبائعين بعد إتمام الطلب تبقى خارج الـ transaction تماماً.

**السبب**: فشل إنشاء إشعار (constraint خطأ، حقل فارغ) لا يجب أن يُلغي طلباً اكتمل بنجاح. الـ `notifyVendors().catch(() => {})` يبلع الخطأ بشكل مقصود ومعروف.

---

## F2 — تصحيح المنطق والتقوية الأمنية

### قرار: حساب حالة الطلب بالتجميع (Aggregate) بدل التتبع المباشر

**القرار**: حالة الطلب الأب (order.status) لا تُنسَخ مباشرة من حالة العنصر الحالي. بدلاً من ذلك، تُقرَأ حالات **كل** عناصر الطلب، ثم تُحسَب الحالة الأب باستخدام `calculateOrderStatus()`.

**السبب**: في طلب متعدد البائعين، بائع واحد يؤكد عنصره لا يعني إن الطلب كله مؤكد. الحالة المحسوبة بالتجميع تعطي صورة صحيحة، والقاعدة "never regress" تمنع تراجع الحالة عند تأخر بائع آخر.

---

### قرار: الحذف الناعم (Soft-delete) للتقييمات

**القرار**: `DELETE /api/reviews/:id` يُغيّر `is_visible = false` بدل حذف الصف من DB.

**السبب**: الحفاظ على سجل التدقيق (audit trail). التقييمات المحذوفة قد تكون مطلوبة لفض نزاعات أو مراجعات قانونية. الكود الحالي بالفعل يُصفّي `isVisible = true` في كل الاستعلامات العامة — فلم يكن هناك تغيير مطلوب في الـ queries.

---

### قرار: فحص التكرار (Duplicate review) قبل الـ INSERT + Safety net

**القرار**: فحص صريح `WHERE customer_id = ? AND order_item_id = ?` قبل إدراج تقييم جديد، مع safety net في `errorHandler.ts` يلتقط Postgres 23505 كـ 409 Conflict.

**السبب**: الفحص الصريح يعطي رسالة خطأ واضحة بالعربي. الـ safety net يحمي كل الـ routes حتى لو فاتنا pre-check في مكان ما — بدل 500 غامض، المستخدم يحصل على 409 مفهوم.

---

### قرار: تقييد رفع الملفات لـ vendor و admin فقط

**القرار**: `POST /api/upload` يحتاج `authorize('vendor', 'admin')` — العملاء (customer) لا يملكون صلاحية الرفع.

**السبب**: لا يوجد use case شرعي لعميل يرفع ملف مباشرة. فقط البائع (صور منتجات/متجر) والأدمن يحتاجون ذلك. هذا يمنع abuse وتخزين غير مرغوب.

---

### قرار: Zod strict() على إعدادات الموقع

**القرار**: `PUT /api/admin/settings` يقبل فقط مفاتيح محددة عبر Zod schema مع `.strict()`.

**السبب**: بدون هذا، أي مفتاح عشوائي يُكتَب في `site_settings` — مما يسمح بـ mass-assignment وتلوث الإعدادات بقيم غير متوقعة.

---

### قرار: إزالة `'unsafe-inline'` من `script-src` في CSP

**القرار**: CSP header يحتوي الآن `script-src 'self'` بدون `'unsafe-inline'`.

**السبب**: الـ production build ينتج ملفات `.js` مجمّعة — لا حاجة لسكريبتات inline. إبقاء `'unsafe-inline'` في `style-src` فقط لأن Google Fonts ونمط CSS يحتاج ذلك (CSS-only — غير ضار أمنياً).

---


---

## الأقسام التقنية الأخرى

---

## F3 — Testing Infrastructure Decisions

### قرار: `app.onError()` مع `handleError()` المشترك

**المشكلة المكتشفة**: في Hono 4.x، الـ `app.use('*', errorHandler)` middleware يعمل كـ try-catch حول المسارات في نفس المستوى، لكنه **لا يصل** إلى الأخطاء المُلقاة داخل subroutes مُركَّبة عبر `app.route()`.

**السبب اللي ظهر فقط في الاختبارات**: الـ `@hono/node-server` يضيف wrapper على مستوى Node.js HTTP يمسك الأخطاء غير المعالجة ويرجعها كـ 500 generic — مما يخفي المشكلة في production. لكن `app.request()` (المستخدم في الاختبارات) ليس له هذا الـ wrapper.

**القرار**: استخراج `handleError(err, c)` كدالة مستقلة مُصدَّرة + تسجيلها في `app.onError()`. كلا الـ handler يستدعيان نفس المنطق:
- `errorHandler` middleware → يمسك أخطاء الـ middleware chain
- `app.onError()` → يمسك أخطاء الـ route handlers (الطريقة الرسمية لـ Hono)

**الأثر على production**: صفر — بل تحسّن: الآن الأخطاء معالجة بشكل صحيح على مستويين بدل الاعتماد على الـ serve() wrapper.

---

### قرار: per-request unique IP لتجاوز Rate Limiter في الاختبارات

**المشكلة**: الـ `authRateLimit` (5 req/min) يشارك bucket واحد لكل الطلبات التي تأتي بـ `X-Forwarded-For: unknown` — وهو ما يحدث عندما يستخدم `app.request()` بدون TCP socket حقيقي.

**القرار**: كل استدعاء لـ `httpRequest()` في الـ helpers يُولّد `X-Forwarded-For: test-<uuid>` فريد. هذا يعطي كل طلب اختبار bucket خاص به.

**لماذا ليس mock للـ rate limiter؟**: Mock يُخفي سلوك حقيقي قد يُخفق في production. الـ UUID approach يُبقي الـ rate limiter فاعلاً ويُعزل الاختبارات بدون تعديل كود الإنتاج.

---

### قرار: `seedCartItem()` يستخدم upsert

**السبب**: الـ `cart_items` table لها unique constraint على `(user_id, product_id)`. الاختبارات التي تضيف عناصر للسلة يجب أن تكون idempotent — إذا فشل اختبار سابق وترك عنصراً في السلة، الاختبار التالي لا يجب أن ينكسر بسبب ذلك.

**القرار**: استخدام `.onConflictDoUpdate()` لتحديث الكمية بدل إدراج مكرر. يعني: `seedCartItem(userId, productId, 3)` يُحدّث إذا وُجد بالفعل بدل الـ crash.

---

### قرار: test infrastructure — direct DB + `app.request()` (لا HTTP server حقيقي)

**البدائل المرفوضة**:
- `supertest` / `axios` → يحتاج TCP server حقيقي، أبطأ، يحتاج إدارة port conflicts
- مشاركة الـ DB instance من `server/db/index.ts` مباشرةً → يستورد `env.ts` بشكل lazy، يُعقّد الـ module loading

**القرار**: كل ملف integration test يُنشئ connection منفصل للـ DB باستخدام نفس `DATABASE_URL`. هذا يتطابق مع نهج `concurrency.test.ts` الموجود ويبقي الاختبارات fully isolated.

---

## F4 — CI/CD, Monitoring, and Build Decisions

### قرار: استخدام `fs.statfs` للمراقبة بدل مكتبات خارجية
**السبب**: Node.js لا يحتوي على API مباشر للتحقق من مساحة القرص. المكتبات الخارجية التي تقوم بذلك غالبًا تعتمد على تشغيل أوامر Shell (مثل `df`) مما يضيف تعقيدات وأخطاء عبر الأنظمة.
**القرار**: بدءًا من Node 19+، الدالة `fs.statfs` متوفرة للتحقق من مساحة القرص المتاحة (blocks). نستخدمها للتحقق من مساحة تخزين `/uploads` بطريقة آمنة وسريعة كجزء من `api/health`.

### قرار: تتبع الأخطاء باستخدام Sentry و Pino مع `request-id`
**السبب**: الاعتماد على `console.error` يجعل تتبع سياق الخطأ (من المستخدم؟ أي طلب؟) مستحيلًا في الإنتاج.
**القرار**: 
1. دمج `pino` لتسجيل سريع ومنظم (JSON) في الإنتاج.
2. إضافة Middleware لتوليد `request-id` يرافق الطلب في جميع مراحل حياته ويطبع مع اللوج.
3. دمج `Sentry` لإرسال الأخطاء غير المعالجة إلى منصة مركزية لتسهيل التنبيه الفوري.

### قرار: Nginx و PM2 كبنية تحتية بدل Docker/K8s
**السبب**: المشروع متوسط الحجم. استخدام Kubernetes يعقد الإدارة دون حاجة حقيقية حاليًا.
**القرار**: PM2 سيتكفل بالحفاظ على السيرفر (Node) حيًا وتدويره على عدد أنوية المعالج (Cluster Mode). و Nginx سيكون مسؤولًا عن (Reverse Proxy) وتقديم الملفات الثابتة (`/uploads` و `dist`) بشكل مباشر لأنه أسرع بكثير من Node.js في هذا النطاق، فضلًا عن توفير الأمان و SSL.

*(تضاف هنا مع كل فيز جديد)*
