# 卡片進度簿

手機優先的信用卡回饋上限、累積消費滿額追蹤。Next.js、Vercel 與 Neon PostgreSQL。

本網站採共用帳簿模式：所有訪客都能查看、編輯、刪除同一份資料。資料庫密碼只存放在伺服器的環境變數，不會傳送到瀏覽器。

## 功能

- 卡片與活動管理；日曆月、帳單週期、季度及指定期間。
- 消費滿額、回饋上限、進度條及剩餘額度。
- 新增消費預設勾選所選卡片的所有活動；編輯保留原選擇。
- 預設深色模式，可切換淺色，記住裝置偏好。
- 手機底部導覽、44px 觸控區與全螢幕編輯表單。
- 雲端共用資料及樂觀鎖定，避免同時編輯覆蓋。

## 本機與部署

1. `npm ci`
2. 複製 `.env.example` 為 `.env.local`，填入 Neon 的 `DATABASE_URL`。
3. 在 Neon 執行 `drizzle/0000_curved_chronomancer.sql`。
4. `npm run dev`；正式建置使用 `npm run build`。
5. Vercel 匯入此儲存庫，設定 `DATABASE_URL`，框架選 Next.js。

資料表結構由 `db/schema.ts` 管理。修改後使用 `npm run db:generate` 產生新的遷移檔，不覆寫已套用檔案。

所有金額為 NT$。日期與週期依 Asia/Taipei；帳單週期含結帳日，次日為新週期。回饋金額是依活動比例估算，也可手動指定實際回饋。
