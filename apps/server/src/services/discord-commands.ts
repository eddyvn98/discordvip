import { PermissionFlagsBits } from "discord.js";

export function getDiscordGuildCommands() {
  return [
    { name: "menu", description: "Mở menu bot bằng nút" },
    { name: "invite", description: "Mở menu mời bạn nhận điểm đổi VIP" },
    {
      name: "donate",
      description: "Tạo đơn ủng hộ server",
      options: [
        {
          name: "plan",
          description: "Chọn gói ủng hộ",
          type: 3,
          required: true,
          choices: [
            { name: "39.000đ tặng VIP 31 ngày", value: "VIP_30_DAYS" },
            { name: "99.000đ tặng VIP 90 ngày", value: "VIP_90_DAYS" },
            { name: "199.000đ tặng VIP 365 ngày", value: "VIP_365_DAYS" },
          ],
        },
      ],
    },
    { name: "trialvip", description: "Nhận trial VIP 24h (mỗi 30 ngày 1 lần)" },
    { name: "vipstatus", description: "Xem trạng thái VIP hiện tại" },
    {
      name: "redeemvip",
      description: "Nhập mã khuyến mãi để nhận thêm ngày VIP",
      options: [{ name: "code", description: "Mã khuyến mãi", type: 3, required: true }],
    },
    {
      name: "adminstats",
      description: "Xem thống kê VIP và doanh thu tháng",
      default_member_permissions: PermissionFlagsBits.Administrator.toString(),
    },
    {
      name: "grantvip",
      description: "Điều chỉnh hạn VIP của thành viên",
      default_member_permissions: PermissionFlagsBits.Administrator.toString(),
      options: [
        { name: "user", description: "Thành viên cần điều chỉnh VIP", type: 6, required: true },
        { name: "days", description: "Số ngày điều chỉnh, âm để trừ", type: 4, required: true },
      ],
    },
    {
      name: "revokevip",
      description: "Thu hồi VIP của thành viên",
      default_member_permissions: PermissionFlagsBits.Administrator.toString(),
      options: [{ name: "user", description: "Thành viên cần thu hồi VIP", type: 6, required: true }],
    },
  ];
}
