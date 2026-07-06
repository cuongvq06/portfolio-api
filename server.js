const jsonServer = require("json-server");
const mongoose = require("mongoose");
const cors = require("cors");
const server = jsonServer.create();
const router = jsonServer.router("db.json");
const middlewares = jsonServer.defaults();

const MONGO_URI =
  "mongodb+srv://cuongvqtp00650:06112007@cluster0.ajkvvtm.mongodb.net/portfolio?retryWrites=true&w=majority&appName=Cluster0";

const DataSchema = new mongoose.Schema(
  {
    campaigns: { type: Array, default: [] },
    orders: { type: Array, default: [] },
  },
  { timestamps: true },
);

const DataModel = mongoose.model("Data", DataSchema);

server.use(cors());
server.use(middlewares);
server.use(jsonServer.bodyParser);

// ==========================================
// 🚀 ĐÃ LOẠI BỎ MIDDLEWARE GET TRUY VẤN ĐỒNG THỜI VÀO MONGODB ĐỂ TĂNG TỐC 10 LẦN
// ==========================================

// Lắng nghe thay đổi (POST, PUT, DELETE, PATCH) để cập nhật lên MongoDB Atlas ngầm
server.use(async (req, res, next) => {
  if (["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) {
    next(); // Cho json-server phản hồi Front-end ngay lập tức không cần đợi

    // Lưu ngầm lên MongoDB sau khi Front-end đã nhận được phản hồi thành công
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
            { upsert: true },
          );
          console.log(" Đã đồng bộ dữ liệu mới ngầm lên MongoDB Atlas!");
        }
      } catch (err) {
        console.error(" Lỗi đồng bộ ngầm:", err);
      }
    }, 100);
  } else {
    next();
  }
});

server.use(router);

// Kết nối cơ sở dữ liệu và nạp dữ liệu vào bộ nhớ đệm ban đầu
mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log(" Đã kết nối thành công tới MongoDB Atlas!");

    // Nạp dữ liệu từ MongoDB lên db.json của json-server ngay khi khởi động
    const currentData = await DataModel.findOne();
    if (currentData) {
      router.db.setState({
        campaigns: currentData.campaigns || [],
        orders: currentData.orders || [],
      });
      console.log(
        "⚡ Đã nạp thành công dữ liệu từ MongoDB vào bộ nhớ đệm bộ định tuyến!",
      );
    } else {
      await DataModel.create({ campaigns: [], orders: [] });
    }

    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      console.log(` Server tốc độ cao đang chạy tại port ${PORT}`);
    });
  })
  .catch((err) => console.error(" Lỗi kết nối MongoDB:", err));
