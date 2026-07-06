const jsonServer = require("json-server");
const mongoose = require("mongoose");
const server = jsonServer.create();
const router = jsonServer.router("db.json"); // Vẫn giữ để làm bộ khung
const middlewares = jsonServer.defaults();

// 1. THAY CHUỖI KẾT NỐI CỦA BẠN VÀO ĐÂY (Nhớ thay <db_password> thành mật khẩu của bạn)
const MONGO_URI =
  "mongodb+srv://cuongvqtp00650:06112007@cluster0.ajkvvtm.mongodb.net/portfolio?retryWrites=true&w=majority&appName=Cluster0";
// 2. Định nghĩa cấu trúc lưu trữ trên MongoDB
const DataSchema = new mongoose.Schema(
  {
    campaigns: { type: Array, default: [] },
    orders: { type: Array, default: [] },
  },
  { timestamps: true },
);

const DataModel = mongoose.model("Data", DataSchema);

server.use(middlewares);
server.use(jsonServer.bodyParser);

// Kết nối MongoDB trước khi chạy Server
mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log("👉 Đã kết nối thành công tới MongoDB Atlas!");

    // Tạo bản ghi đầu tiên nếu database trống
    let currentData = await DataModel.findOne();
    if (!currentData) {
      currentData = await DataModel.create({ campaigns: [], orders: [] });
    }

    // 3. Đọc dữ liệu từ MongoDB về bộ nhớ tạm mỗi khi có Request dữ liệu (GET)
    server.use(async (req, res, next) => {
      const data = await DataModel.findOne();
      router.db.setState({
        campaigns: data.campaigns,
        orders: data.orders,
      });
      next();
    });

    // 4. Lắng nghe các hành động Thay đổi dữ liệu (POST, PUT, DELETE, PATCH) để lưu lên MongoDB
    server.use(async (req, res, next) => {
      if (["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) {
        // Đợi json-server xử lý xong ở bộ nhớ tạm
        next();
        // Sau đó đồng bộ lưu thẳng lên MongoDB luôn
        setTimeout(async () => {
          const latestData = router.db.getState();
          await DataModel.updateOne(
            {},
            {
              campaigns: latestData.campaigns,
              orders: latestData.orders,
            },
          );
          console.log("💾 Đã đồng bộ dữ liệu mới lên MongoDB Atlas!");
        }, 500);
      } else {
        next();
      }
    });

    // Sử dụng bộ định tuyến mặc định của json-server
    server.use(router);

    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      console.log(`🚀 JSON Server đang chạy tại port ${PORT}`);
    });
  })
  .catch((err) => console.error("❌ Lỗi kết nối MongoDB:", err));
