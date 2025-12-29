# Design Styles Library

此目录存放所有设计风格的完整设计系统文档。

## 目录结构

```
styles/
├── README.md           # 本文档
├── monochrome.md       # 极简黑白风格
├── bauhaus.md          # 包豪斯几何风格
└── ...                 # 更多风格（待添加）
```

## 已集成风格

### 1. Monochrome (monochrome.md)
- **模式**: Light
- **字体**: Serif
- **特点**: 纯黑白、极简、编辑风格
- **适用**: 时尚、建筑、艺术、高端品牌

### 2. Bauhaus (bauhaus.md)
- **模式**: Light
- **字体**: Sans-serif
- **特点**: 几何图形、三原色、现代主义
- **适用**: 创意机构、设计工作室、艺术教育

## 待添加风格

以下风格可从 https://www.designprompts.dev/ 获取：

### Light Mode 风格
- [ ] 03. Modern Dark
- [ ] 04. Newsprint
- [ ] 05. SaaS
- [ ] 06. Luxury
- [ ] 08. Swiss Minimalist
- [ ] 10. Flat Design
- [ ] 12. Material Design
- [ ] 13. Neo Brutalism
- [ ] 15. Academia
- [ ] 18. Playful Geometric
- [ ] 20. Claymorphism
- [ ] 21. Professional
- [ ] 22. Botanical
- [ ] 24. Enterprise
- [ ] 25. Sketch
- [ ] 26. Industrial
- [ ] 27. Neumorphism
- [ ] 28. Organic
- [ ] 29. Maximalism
- [ ] 30. Retro

### Dark Mode 风格
- [ ] 07. Terminal
- [ ] 09. Kinetic
- [ ] 11. Art Deco
- [ ] 14. Bold Typography
- [ ] 16. Cyberpunk
- [ ] 17. Web3
- [ ] 19. Minimal Dark
- [ ] 23. Vaporwave

## 文件命名规范

- 使用小写
- 单词之间用连字符（-）
- 格式：`{风格名}.md`
- 示例：`swiss-minimalist.md`, `neo-brutalism.md`

## 文件内容规范

每个风格文档必须包含：

1. **标题**：`# {风格名} Design System`
2. **元数据**：
   - 风格ID
   - 模式 (Light/Dark)
   - 字体类型 (Sans-serif/Serif/Mono)
   - 简短描述
3. **适用场景**：列表形式
4. **情感调性**：关键词
5. **适用行业**：行业列表
6. **设计系统提示词**：完整的设计系统规范

## 如何添加新风格

详细步骤参见：`../EXTEND.md`

快速步骤：
1. 从 designprompts.dev 复制提示词
2. 创建新的 .md 文件
3. 填充模板内容
4. 更新 SKILL.md 中的风格索引

## 设计系统来源

所有设计系统提示词来自：
- **Design Prompts**: https://www.designprompts.dev/
- **授权**: 这些设计系统提示词可公开使用

## 维护

- 定期更新设计系统规范
- 添加使用案例和示例
- 收集用户反馈优化元数据

---

需要帮助？查看 EXTEND.md 扩展指南
