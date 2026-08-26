import time
from locust import HttpUser, task, between

class WebsiteUser(HttpUser):
    # وقت الانتظار العشوائي بين المهام لكل مستخدم (بين 1 إلى 5 ثوانٍ)
    wait_time = between(1, 5)

    def on_start(self):
        """
        يتم استدعاء هذه الدالة عند بدء محاكاة مستخدم جديد.
        مثالي لإعداد جلسة (Session) أو تسجيل الدخول.
        """
        # مثال لتسجيل الدخول:
        # self.client.post("/api/login", json={"username": "test_user", "password": "password"})
        pass

    @task(3)
    def index_page(self):
        """
        محاكاة زيارة الصفحة الرئيسية (الوزن 3 يعني أن هذه المهمة ستحدث أكثر من غيرها)
        """
        self.client.get("/")

    @task(1)
    def view_products(self):
        """
        محاكاة تصفح المنتجات
        """
        # عدل المسار ليتوافق مع الـ API الخاص بمنتجاتك
        self.client.get("/api/products")

    @task(1)
    def simulate_user_flow(self):
        """
        محاكاة رحلة مستخدم معقدة:
        1. تصفح المنتجات
        2. قراءة تفاصيل منتج معين
        """
        self.client.get("/api/products")
        time.sleep(1) # المستخدم يقرأ
        self.client.get("/api/products/1") # جلب تفاصيل أول منتج كـ مثال
