# 股票分时数据后端 API

## API 接口文档

### 1. 健康检查

**URL:** `GET /api/health`

**响应示例:**
```json
{
  "code": 200,
  "message": "Service is running",
  "data": null
}
```

---

### 2. 获取分时数据

**URL:** `GET /api/stock/minutes`

**请求参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| code | string | 是 | 股票代码 |
| date | string | 是 | 日期 (格式: YYYYMMDD) |

**请求示例:**
```bash
curl "http://localhost:5000/api/stock/minutes?code=000400&date=20260420"
```

**响应示例:**
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "price": 10.0,
      "vol": 1000,
      "amount": 10000.0,
      "cum_amount": 10000.0,
      "cum_vol": 1000,
      "avg_price": 10.0,
      "hour": 9,
      "minute": 30,
      "code": "000400",
      "trade_date": "2026-04-20"
    }
  ]
}
```

**新增字段说明:**
- `amount`: 每分钟成交额 (price * vol)
- `cum_amount`: 累计成交额
- `cum_vol`: 累计成交量
- `avg_price`: 分时均线价格 (cum_amount / cum_vol，保留2位小数)

**分时均线计算公式:**
- 分时均价 = 累计成交额 / 累计成交量

---

### 3. 获取当前价格和涨跌幅

**URL:** `GET /api/stock/price/current`

**请求参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| code | string | 是 | 股票代码 |

**请求示例:**
```bash
curl "http://localhost:5000/api/stock/price/current?code=000400"
```

**响应示例:**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "code": "000400",
    "current_price": 10.55,
    "change_percent": 2.34
  }
}
```

---

### 4. 获取 KDJ 指标

**URL:** `GET /api/stock/indicator/kdj`

**请求参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| code | string | 是 | 股票代码 |
| period | string | 否 | 周期 (day/week/mon, 默认: day) |
| date | string | 否 | 日期 (格式: YYYY-MM-DD, 默认: latest) |

**请求示例:**
```bash
# 日K（默认）
curl "http://localhost:5000/api/stock/indicator/kdj?code=000400&period=day"

# 周K
curl "http://localhost:5000/api/stock/indicator/kdj?code=000400&period=week"

# 月K
curl "http://localhost:5000/api/stock/indicator/kdj?code=000400&period=mon"
```

**响应示例:**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "code": "000400",
    "period": "day",
    "date": "latest",
    "kdj": {
      "k": 55.55,
      "d": 45.45,
      "j": 77.77
    }
  }
}
```

---

### 5. 获取 MACD 指标

**URL:** `GET /api/stock/indicator/macd`

**请求参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| code | string | 是 | 股票代码 |
| period | string | 否 | 周期 (day/week/mon, 默认: day) |
| date | string | 否 | 日期 (格式: YYYY-MM-DD, 默认: latest) |

**请求示例:**
```bash
# 日K（默认）
curl "http://localhost:5000/api/stock/indicator/macd?code=000400&period=day"

# 周K
curl "http://localhost:5000/api/stock/indicator/macd?code=000400&period=week"

# 月K
curl "http://localhost:5000/api/stock/indicator/macd?code=000400&period=mon"
```

**响应示例:**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "code": "000400",
    "period": "day",
    "date": "latest",
    "macd": {
      "dif": 0.12,
      "dea": 0.08,
      "macd": 0.08
    }
  }
}
```

---

### 6. 获取 BBI 指标

**URL:** `GET /api/stock/indicator/bbi`

**请求参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| code | string | 是 | 股票代码 |
| period | string | 否 | 周期 (day/week/mon, 默认: day) |
| date | string | 否 | 日期 (格式: YYYY-MM-DD, 默认: latest) |

**请求示例:**
```bash
# 日K（默认）
curl "http://localhost:5000/api/stock/indicator/bbi?code=000400&period=day"

# 周K
curl "http://localhost:5000/api/stock/indicator/bbi?code=000400&period=week"

# 月K
curl "http://localhost:5000/api/stock/indicator/bbi?code=000400&period=mon"
```

**响应示例:**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "code": "000400",
    "period": "day",
    "date": "latest",
    "bbi": 10.55
  }
}
```

---

## 统一响应格式

所有 API 接口返回统一的响应格式：

```json
{
  "code": 200,
  "message": "success",
  "data": {}
}
```

**状态码说明:**
- `200`: 成功
- `400`: 请求参数错误
- `404`: 资源未找到
- `500`: 服务器内部错误

## 技术指标说明

- **KDJ**: 随机指标（支持日K/周K/月K）
- **MACD**: 平滑异同移动平均线（支持日K/周K/月K）
- **BBI**: 多空均线（支持日K/周K/月K）

所有指标数据均保留 2 位小数。
