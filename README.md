# Zotero-RAGFlow 插件

Zotero-RAGFlow是一款将RAG（检索增强生成）技术集成到Zotero中的插件，让研究人员和学者能够基于自己的文献资料构建知识库并进行智能问答。通过该插件，用户可以直接将Zotero条目中的附件文档上传到RAGFlow服务，构建个性化知识库，并利用大语言模型对自己的文献进行提问和分析。

## 功能特点

- **知识库构建**：将Zotero集合中的附件文件上传到RAGFlow服务，自动构建知识库
- **智能问答**：基于自己的文献资料进行提问，获取精准回答
- **参考来源追踪**：回答内容附带原始文档参考来源，确保可溯源性
- **多种模型支持**：提供多种大语言模型选择，如deepseek-chat、qwen-turbo等
- **参数自定义**：可配置温度、相似度阈值等关键参数
- **历史记录管理**：保存问答历史，支持重复提问和回答复制
- **本地部署支持**：支持连接本地部署的RAGFlow服务

## 安装说明

1. 下载最新版本的`zotero-ragflow.xpi`插件文件
2. 在Zotero中打开"工具" > "附加组件"
3. 点击齿轮图标，选择"从文件安装附加组件"
4. 选择下载的`zotero-ragflow.xpi`文件
5. 重启Zotero完成安装

## 配置设置

首次使用前，需完成以下配置：

1. 点击"工具" > "RAGFlow设置"或顶部菜单栏"RAGFlow" > "设置"
2. 输入RAGFlow API密钥
3. 设置RAGFlow API URL
   - 本地部署默认为`http://127.0.0.1:8000`
   - 云服务使用提供商指定的URL

## 使用指南

### 创建知识库

1. 在Zotero中选择一个包含文献的集合
2. 右键单击该集合，选择"发送到RAGFlow知识库"
3. 在弹出的确认对话框中点击"确定"
4. 系统将自动上传集合中的附件文件并构建知识库
   - 支持PDF、Word文档、文本文件等格式
   - 不支持HTML快照文件

### 选择知识库

1. 点击顶部菜单"RAGFlow" > "选择已有知识库"
2. 从列表中选择要使用的知识库

### 配置聊天助手

1. 点击"RAGFlow" > "聊天助手设置"
2. 选择模型（如deepseek-chat、qwen-turbo等）
3. 调整参数：
   - 温度：控制回答的创造性（0-1）
   - 相似度阈值：控制文档检索的相关性要求
   - 检索结果数量：影响参考来源数量

### 知识库问答

1. 点击"RAGFlow" > "RAGFlow知识库问答"
2. 在对话框中输入您的问题
3. 点击"提问"按钮
4. 系统会显示回答结果及其参考来源

### 查看历史记录

1. 点击"RAGFlow" > "查看问答历史"
2. 浏览之前的问答记录
3. 可以复制回答或再次提问相同问题

## 系统架构图

### 整体架构

```mermaid
graph TD
    User([用户]) <--> ZoteroUI[Zotero界面]
    ZoteroUI <--> Addon[插件主模块]
    Addon --> RFService[RAGFlowService]
    Addon --> RFUI[RAGFlowUI]
    Addon --> Logger[Logger]
    Addon --> Storage[StorageManager]

    RFService <--> |API请求|RAGFlow[RAGFlow服务]
    Storage --> |存储|LocalFS[本地文件系统]

    subgraph "Zotero插件"
        Addon
        RFService
        RFUI
        Logger
        Storage
    end
```

### 知识库创建流程

```mermaid
sequenceDiagram
    participant User as 用户
    participant UI as RAGFlowUI
    participant Addon as 插件核心
    participant Service as RAGFlowService
    participant RAGFlow as RAGFlow服务

    User->>UI: 选择集合并右键
    User->>UI: 点击"发送到RAGFlow知识库"
    UI->>Addon: 调用uploadCollectionToRAGFlow()
    Addon->>Addon: 获取附件文件列表
    Addon->>Service: uploadFiles(files, collectionName)
    Service->>RAGFlow: 创建数据集
    RAGFlow-->>Service: 返回数据集ID
    Service->>RAGFlow: 上传文件
    RAGFlow-->>Service: 上传结果
    Service->>RAGFlow: 解析文档
    RAGFlow-->>Service: 处理结果
    Service-->>Addon: 返回知识库ID
    Addon->>Addon: 保存知识库ID和名称
    Addon->>UI: 显示进度和结果
    UI-->>User: 显示完成通知
```

### 知识库问答流程

```mermaid
sequenceDiagram
    participant User as 用户
    participant UI as RAGFlowUI
    participant Addon as 插件核心
    participant Service as RAGFlowService
    participant RAGFlow as RAGFlow服务
    participant Storage as StorageManager

    User->>UI: 输入问题
    UI->>Addon: processQuestion(question)

    alt 首次使用
        Addon->>UI: 打开聊天助手设置
        UI->>User: 显示设置界面
        User->>UI: 配置模型参数
        UI->>Addon: 返回配置参数
        Addon->>Service: createChatAssistant()
        Service->>RAGFlow: API请求创建聊天助手
        RAGFlow-->>Service: 返回聊天助手ID
        Addon->>Addon: 保存聊天助手映射
    end

    alt 没有活动会话
        Addon->>Service: createSession()
        Service->>RAGFlow: API请求创建会话
        RAGFlow-->>Service: 返回会话ID
        Addon->>Addon: 保存会话ID
    end

    Addon->>Service: askQuestion(question)
    Service->>RAGFlow: API请求提问
    RAGFlow->>RAGFlow: 检索相关文档并生成回答
    RAGFlow-->>Service: 返回回答和来源
    Service-->>Addon: 返回结果
    Addon->>UI: 显示回答对话框
    Addon->>Storage: 保存问答历史
    UI-->>User: 展示回答和来源
```

### 历史记录管理流程

```mermaid
flowchart TD
    A[用户查看历史] --> B{StorageManager获取历史}
    B -->|有历史记录| C[显示历史记录列表]
    B -->|无历史记录| D[显示无记录提示]

    C --> E[用户操作]
    E --> F[复制回答]
    E --> G[再次提问]
    E --> H[管理历史]

    H --> I{是否清除历史}
    I -->|是| J[清除所有历史]
    I -->|否| K[返回历史列表]

    J --> L[显示清除成功]
```

## 技术细节

### 支持的文件类型

- PDF文档 (.pdf)
- Word文档 (.doc, .docx)
- 文本文件 (.txt)
- 其他RAGFlow支持的文件类型

**注意:** 当前不支持HTML快照文件

### 模型选项

可用的大语言模型:

- deepseek-resoner
- deepseek-chat
- qwen-turbo
- qwen-max
- qwen-plus
- qwen-long

### 存储管理

- 聊天历史保存在Zotero数据目录的`ragflow-history`文件夹中
- 知识库ID、聊天助手ID和会话ID保存在Zotero首选项中

## 常见问题

1. **问: 为什么我的HTML快照无法上传?**  
   答: 当前版本不支持HTML快照文件，请使用PDF或文本文件。

2. **问: 如何切换不同的知识库?**  
   答: 点击"RAGFlow" > "选择已有知识库"，从列表中选择。

3. **问: 如何优化问答质量?**  
   答: 调整聊天助手设置中的参数，特别是相似度阈值和温度值。

4. **问: API余额不足怎么办?**  
   答: 登录RAGFlow平台充值或联系服务提供商。

## 注意事项

- 知识库构建需要时间，取决于文档数量和大小
- 大型文档集合可能需要较高的处理资源
- 请确保有足够的API余额用于处理请求
- 处理敏感数据时请考虑数据隐私和安全性

## 许可信息

此插件基于[MIT许可证](LICENSE)发布。

---

_Zotero-RAGFlow: 让文献知识流动起来_
