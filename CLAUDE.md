# Quy tắc commit

Mọi commit message phải theo chuẩn Conventional Commits:

```
<type>(<scope>): <mô tả ngắn>
```

- `scope` là tùy chọn, ghi tên phần bị ảnh hưởng (ví dụ `home`, `auth`, `api`).
- Mô tả viết ngắn gọn, bằng tiếng Việt, không kết thúc bằng dấu chấm.

## Các prefix (type)

| Prefix     | Ý nghĩa                                                          | Ví dụ                                        |
|------------|------------------------------------------------------------------|----------------------------------------------|
| `feat`     | Thêm tính năng mới                                               | `feat(auth): thêm chức năng login bằng Google` |
| `fix`      | Sửa lỗi                                                          | `fix(cart): sửa lỗi không thêm được sản phẩm vào giỏ hàng` |
| `docs`     | Thay đổi hoặc thêm tài liệu                                      | `docs: cập nhật README hướng dẫn setup project` |
| `style`    | Thay đổi style code, format, không ảnh hưởng logic               | `style: format code theo eslint`             |
| `refactor` | Refactor, đổi cấu trúc nhưng không đổi tính năng                 | `refactor(header): tách component Header thành file riêng` |
| `test`     | Thêm hoặc sửa test                                               | `test: thêm unit test cho utils`             |
| `chore`    | Công việc lặt vặt, không liên quan logic (script, update lib...) | `chore: update dependencies`                 |
| `perf`     | Tối ưu hiệu năng                                                 | `perf: cải thiện tốc độ render`              |
| `build`    | Thay đổi cấu hình build hoặc dependencies                        | `build: cấu hình vite.config.js`             |
| `ci`       | Thay đổi file CI/CD (GitHub Actions, GitLab CI, Jenkins...)      | `ci: thêm workflow deploy`                   |

## Ví dụ

```bash
git commit -m "feat(home): thêm trang Home, chưa responsive"
git commit -m "fix(ui): fix lỗi button không canh giữa"
git commit -m "docs(api): thêm mô tả API login"
git commit -m "style(home): chỉnh padding trang chủ"
git commit -m "refactor(api): tối ưu hàm fetchData"
```
