# 任务拆解器 - 使用示例

## 示例 1: 用户管理系统

### 输入需求
"帮我做一个用户管理系统，包含注册、登录、个人信息管理功能"

### 拆解结果

```
[任务卡]
标题: 创建用户注册 /api/v1/users/register
切片: DB(users表: id,username,email,password_hash,created_at) / API(POST /api/v1/users/register 校验:username≥3字符,email格式,password≥8字符) / UI(/register 页面:注册表单)
验证点: 1) 打开 /register 填写表单提交 2) 查看数据库users表新记录 3) 测试重复用户名被拒绝
DoD: ✅ 页面可访问并有表单 ✅ 提交后数据写入users表 ✅ 请求日志含追踪ID ✅ 可测试成功注册/重复用户/字段校验 ✅ README含启动和测试命令
约束: 密码明文存储(后续加密),邮箱验证延后,无外部依赖
演示点: 30秒录屏：打开注册页→填写信息→提交→查数据库确认记录

[任务卡]
标题: 创建用户登录 /api/v1/users/login
切片: DB(users表: username,password_hash) / API(POST /api/v1/users/login 校验:username存在,password匹配) / UI(/login 页面:登录表单)
验证点: 1) 已注册用户登录成功 2) 错误密码登录失败 3) 不存在的用户登录失败
DoD: ✅ 登录页面可访问 ✅ 成功登录返回token ✅ 错误有明确反馈 ✅ 可测试成功/失败场景 ✅ README含测试命令
约束: 使用假token(后续JWT),无session管理,密码校验延后
演示点: 30秒录屏：打开登录页→输入正确信息→登录成功→查看响应

[任务卡]
标题: 更新用户头像 /api/v1/users/profile/avatar
切片: DB(users表: avatar_url) / API(PUT /api/v1/users/profile/avatar 校验:文件类型jpg/png,大小≤2MB) / UI(/profile 页面:头像上传按钮)
验证点: 1) 登录后访问/profile 2) 上传头像文件 3) 刷新页面显示新头像
DoD: ✅ 个人资料页可访问 ✅ 头像上传成功 ✅ 数据库avatar_url更新 ✅ 可测试上传成功/文件类型错误/文件过大 ✅ README含文件上传说明
约束: 文件存储本地(后续云存储),无图片处理,URL直接存库
演示点: 45秒录屏：登录→进入个人页→上传头像→刷新确认→检查数据库
```

## 示例 2: 博客系统

### 输入需求
"开发一个博客系统，包含文章发布、分类管理、评论功能"

### 拆解结果

```
[任务卡]
标题: 创建文章发布 /api/v1/posts/create
切片: DB(posts表: id,title,content,author_id,status,created_at) / API(POST /api/v1/posts/create 校验:title≥5字符,content≥50字符,status∈[draft,published]) / UI(/editor 页面:文章编辑器)
验证点: 1) 打开/editor 编写文章 2) 点击发布按钮 3) 数据库查看新文章记录
DoD: ✅ 编辑器页面可访问 ✅ 文章成功写入posts表 ✅ 请求日志完整 ✅ 可测试发布/草稿/字段校验 ✅ README含使用方法
约束: 富文本用简单textarea(后续升级),无审核流程,作者ID固定
演示点: 40秒录屏：打开编辑器→输入标题内容→点击发布→数据库确认

[任务卡]
标题: 创建文章分类 /api/v1/categories/create
切片: DB(categories表: id,name,description,created_at) / API(POST /api/v1/categories/create 校验:name唯一,长度2-20字符) / UI(/categories 页面:分类管理表单)
验证点: 1) 访问/categories页面 2) 填写分类名称和描述 3) 提交后查看分类列表
DoD: ✅ 分类管理页可访问 ✅ 分类成功创建 ✅ 名称唯一性校验 ✅ 可测试成功创建/重复名称/字段长度 ✅ README含API说明
约束: 分类与文章关联延后,无层级结构,描述可选
演示点: 35秒录屏：进入分类页→添加新分类→提交→列表显示新分类
```

## 示例 3: 电商订单系统

### 输入需求
"做一个简单的电商系统，包含商品管理、下单、订单状态跟踪"

### 拆解结果

```
[任务卡]
标题: 创建商品上架 /api/v1/products/create
切片: DB(products表: id,name,price,stock,description,status,created_at) / API(POST /api/v1/products/create 校验:name≥2字符,price>0,stock≥0) / UI(/admin/products 页面:商品添加表单)
验证点: 1) 访问商品管理页 2) 填写商品信息提交 3) 数据库查看新商品
DoD: ✅ 商品管理页可访问 ✅ 商品数据成功写入 ✅ 价格和库存校验 ✅ 可测试正常添加/价格非法/库存负数 ✅ README含字段说明
约束: 商品图片延后,无分类管理,状态默认为active
演示点: 45秒录屏：进入商品管理→点击添加商品→填写信息→提交→数据库确认

[任务卡]
标题: 创建订单 /api/v1/orders/create
切片: DB(orders表: id,user_id,total_amount,status,created_at; order_items表: id,order_id,product_id,quantity,price) / API(POST /api/v1/orders/create 校验:商品存在且库存充足) / UI(/checkout 页面:结算下单)
验证点: 1) 选择商品到购物车 2) 进入结算页点击下单 3) 查看订单和库存变化
DoD: ✅ 结算页可访问 ✅ 订单和订单项写入 ✅ 库存正确扣减 ✅ 可测试成功下单/库存不足/商品不存在 ✅ README含事务说明
约束: 购物车用假数据(后续实现),支付流程延后,库存简单扣减
演示点: 60秒录屏：选择商品→进入结算→点击下单→查看订单→检查库存变化
```

## 使用技巧

### 如何识别需要继续拆分的任务
- 如果一个任务涉及多个页面 → 按页面拆分
- 如果一个任务涉及多个数据模型 → 按模型拆分
- 如果一个任务同时包含增删改 → 按操作类型拆分
- 如果验证时间超过2分钟 → 继续拆小

### 常见陷阱
- ❌ "用户管理系统"太粗 → ✅ 拆成注册/登录/资料修改
- ❌ "文章发布包含分类"太复杂 → ✅ 先发布功能，再分类管理
- ❌ "订单系统"太笼统 → ✅ 拆成商品上架/下单/状态更新
- ❌ "完整CRUD"太庞大 → ✅ 按C-R-U-D分别拆分

### 最佳实践
- 永远先问"最小可运行的是什么？"
- 先打通数据流，再考虑业务规则
- 先实现单一路径，再考虑分支情况
- 用假数据/固定响应先跑通闭环
- 把校验、边界、样式放到后续卡

## 注意事项

1. **用户确认原则**：输出任务卡后必须等待用户确认
2. **重切原则**：如被判颗粒度不合格，必须自动重切
3. **黑名单检查**：每卡必须检查无优化/完善等模糊词
4. **DoD验证**：每卡必须确认六项都能落地
5. **演示可行性**：每卡必须能在30-60秒内完成录屏演示

记住：**先打通，再完善；先闭环，再优化。**