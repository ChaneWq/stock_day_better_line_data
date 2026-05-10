# 后端 API 性能优化说明

## 已完成的优化

### 1. 更快的 JSON 序列化
- 使用 `orjson` 替代 Python 标准库的 `json`
- 性能提升约 2-5 倍

### 2. Gzip 响应压缩
- 使用 `flask-compress` 自动压缩响应
- 减少网络传输量，加快加载速度

### 3. 多层缓存策略
- **第一层**：Flask-Caching（内存缓存，最快）
- **第二层**：Redis 缓存（分布式缓存）
- 缓存时间根据接口类型设置：
  - 价格数据：60秒
  - 分时数据和指标：300秒

### 4. 批量查询接口
新增两个批量接口，减少 HTTP 请求次数：

#### POST /api/stock/batch/minutes
批量获取多只股票的分时数据
```json
{
  "requests": [
    {"code": "000001", "date": "20240101"},
    {"code": "000002", "date": "20240101"}
  ]
}
```

#### POST /api/stock/batch/price
批量获取多只股票的价格数据
```json
{
  "codes": ["000001", "000002", "000003"]
}
```

### 5. 生产环境 WSGI 服务器
- 使用 `Gunicorn` + `gevent`
- 支持高并发处理

## 使用方式

### 开发环境
```bash
python main.py
```

### 生产环境 (Linux/Mac)
```bash
chmod +x start_prod.sh
./start_prod.sh
```

### 生产环境 (Windows)
```cmd
start_prod.bat
```

## 依赖安装
```bash
pip install -r requirements.txt
```

## 性能提升预期
- 响应速度提升：30%-70%
- 并发处理能力提升：5-10倍
- 网络传输量减少：60%-80%（通过 Gzip）
