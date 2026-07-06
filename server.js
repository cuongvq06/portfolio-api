const jsonServer = require("json-server");
const mongoose = require("mongoose");
const cors = require("cors"); // <-- Thêm cors để sửa lỗi chặn kết nối từ Vercel
const server = jsonServer.create();
const router = jsonServer.router("db.json");
const middlewares = jsonServer.defaults();

const MONGO_URI =
  "mongodb+srv://cuongvqtp00650:06112007@cluster0.ajkvvtm.mongodb.net/portfolio?retryWrites=true&w=majority&appName=Cluster0";

// Định nghĩa cấu trúc lưu trữ trên MongoDB
const DataSchema = new mongoose.Schema(
  {
    campaigns: { type: Array, default: [] },
    orders: { type: Array, default: [] },
  },
  { timestamps: true },
);

const DataModel = mongoose.model("Data", DataSchema);

// Cấu hình các Middleware cơ bản (Phải đặt ở lớp ngoài cùng)
server.use(cors()); // <-- Mở khóa CORS cho phép Front-end Vue gọi API thoải mái
server.use(middlewares);
server.use(jsonServer.bodyParser);

// 3. Đọc dữ liệu từ MongoDB về bộ nhớ tạm mỗi khi có Request dữ liệu (GET)
server.use(async (req, res, next) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const data = await DataModel.findOne();
      if (data) {
        router.db.setState({
          campaigns: data.campaigns || [],
          orders: data.orders || [],
        });
      }
    }
  } catch (err) {
    console.error("❌ Lỗi lấy dữ liệu từ MongoDB:", err);
  }
  next();
});

// 4. Lắng nghe các hành động Thay đổi dữ liệu (POST, PUT, DELETE, PATCH) để lưu lên MongoDB
server.use(async (req, res, next) => {
  if (["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) {
    // Để json-server xử lý thay đổi ở bộ nhớ tạm trước
    next();

    // Ngay sau đó đồng bộ lưu thẳng lên MongoDB luôn
    setTimeout(async () => {
      try {
        if (mongoose.connection.readyState === 1) {
          const latestData = router.db.getState();
          await DataModel.updateOne(
            {},
            {
              campaigns: latestData.campaigns,
              orders: latestData.orders,
            },
            { upsert: true }, // Nếu chưa có bản ghi nào thì tự tạo mới
          );
          console.log(
            "💾 Đã đồng bộ dữ liệu mới thành công lên MongoDB Atlas!",
          );
        }
      } catch (err) {
        console.error("❌ Lỗi đồng bộ lên MongoDB:", err);
      }
    }, 200);
  } else {
    next();
  }
});

// Sử dụng bộ định tuyến mặc định của json-server
server.use(router);

// Kết nối cơ sở dữ liệu và kích hoạt Server
mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log("👉 Đã kết nối thành công tới MongoDB Atlas!");

    // Khởi tạo bản ghi gốc nếu DB trống hoàn toàn
    const currentData = await DataModel.findOne();
    if (!currentData) {
      await DataModel.create({ campaigns: [], orders: [] });
      console.log("🆕 Đã khởi tạo cấu trúc database trống trên MongoDB.");
    }

    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      console.log(`🚀 JSON Server đang chạy tại port ${PORT}`);
    });
  })
  .catch((err) => console.error("❌ Lỗi kết nối MongoDB:", err));
