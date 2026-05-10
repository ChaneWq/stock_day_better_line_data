"""
API控制器层
"""
from flask import Blueprint, request, jsonify
from model.response import success_response, error_response, ResponseCode
from functools import wraps


api_bp = Blueprint('api', __name__)


def create_api_routes(app, stock_service, cache=None):
    """
    创建API路由
    
    Args:
        app: Flask应用实例
        stock_service: 股票服务实例
        cache: Flask-Caching 实例（可选）
    """
    
    def cached(timeout=60):
        """缓存装饰器包装器"""
        def decorator(f):
            if cache:
                return cache.cached(timeout=timeout, query_string=True)(f)
            return f
        return decorator
    
    @app.route('/api/health', methods=['GET'])
    def health():
        """健康检查接口"""
        return jsonify(success_response(message="Service is running"))
    
    @app.route('/api/stock/minutes', methods=['GET'])
    @cached(timeout=300)
    def get_minutes():
        """获取分时数据"""
        try:
            code = request.args.get('code')
            date = request.args.get('date')
            
            if not code or not date:
                return jsonify(error_response(ResponseCode.BAD_REQUEST, "股票代码和日期不能为空"))
            
            df = stock_service.get_minutes_data(code, date)
            
            if df is None:
                return jsonify(error_response(ResponseCode.NOT_FOUND, "未找到数据"))
            
            data = df.to_dict(orient='records')
            
            return jsonify(success_response(data))
        except Exception as e:
            return jsonify(error_response(ResponseCode.INTERNAL_ERROR, f"获取分时数据失败: {str(e)}"))
    
    @app.route('/api/stock/price/current', methods=['GET'])
    @cached(timeout=60)
    def get_current_price():
        """获取当前价格和涨跌幅"""
        try:
            code = request.args.get('code')
            
            if not code:
                return jsonify(error_response(ResponseCode.BAD_REQUEST, "股票代码不能为空"))
            
            current_price, change_percent = stock_service.get_price_and_change_percent(code)
            
            return jsonify(success_response({
                "code": code,
                "current_price": current_price,
                "change_percent": change_percent
            }))
        except Exception as e:
            return jsonify(error_response(ResponseCode.INTERNAL_ERROR, f"获取价格失败: {str(e)}"))
    
    @app.route('/api/stock/indicator/kdj', methods=['GET'])
    @cached(timeout=300)
    def get_kdj():
        """获取KDJ指标"""
        try:
            code = request.args.get('code')
            period = request.args.get('period', 'day')
            date_str = request.args.get('date', '')
            
            if not code:
                return jsonify(error_response(ResponseCode.BAD_REQUEST, "股票代码不能为空"))
            
            k, d, j = stock_service.get_kdj(code, period, date_str)
            
            return jsonify(success_response({
                "code": code,
                "period": period,
                "date": date_str if date_str else "latest",
                "kdj": {
                    "k": k,
                    "d": d,
                    "j": j
                }
            }))
        except Exception as e:
            return jsonify(error_response(ResponseCode.INTERNAL_ERROR, f"获取KDJ指标失败: {str(e)}"))
    
    @app.route('/api/stock/indicator/macd', methods=['GET'])
    @cached(timeout=300)
    def get_macd():
        """获取MACD指标"""
        try:
            code = request.args.get('code')
            period = request.args.get('period', 'day')
            date_str = request.args.get('date', '')
            
            if not code:
                return jsonify(error_response(ResponseCode.BAD_REQUEST, "股票代码不能为空"))
            
            dif, dea, macd = stock_service.get_macd(code, period, date_str)
            
            return jsonify(success_response({
                "code": code,
                "period": period,
                "date": date_str if date_str else "latest",
                "macd": {
                    "dif": dif,
                    "dea": dea,
                    "macd": macd
                }
            }))
        except Exception as e:
            return jsonify(error_response(ResponseCode.INTERNAL_ERROR, f"获取MACD指标失败: {str(e)}"))
    
    @app.route('/api/stock/indicator/bbi', methods=['GET'])
    @cached(timeout=300)
    def get_bbi():
        """获取BBI指标"""
        try:
            code = request.args.get('code')
            period = request.args.get('period', 'day')
            date_str = request.args.get('date', '')
            
            if not code:
                return jsonify(error_response(ResponseCode.BAD_REQUEST, "股票代码不能为空"))
            
            bbi = stock_service.get_bbi(code, period, date_str)
            
            return jsonify(success_response({
                "code": code,
                "period": period,
                "date": date_str if date_str else "latest",
                "bbi": bbi
            }))
        except Exception as e:
            return jsonify(error_response(ResponseCode.INTERNAL_ERROR, f"获取BBI指标失败: {str(e)}"))
    
    @app.route('/api/stock/batch/minutes', methods=['POST'])
    @cached(timeout=300)
    def get_batch_minutes():
        """批量获取分时数据"""
        try:
            data = request.get_json()
            requests = data.get('requests', [])
            
            if not requests or len(requests) == 0:
                return jsonify(error_response(ResponseCode.BAD_REQUEST, "请求列表不能为空"))
            
            results = []
            for req in requests:
                code = req.get('code')
                date = req.get('date')
                if code and date:
                    df = stock_service.get_minutes_data(code, date)
                    if df is not None:
                        results.append({
                            'code': code,
                            'date': date,
                            'data': df.to_dict(orient='records')
                        })
            
            return jsonify(success_response(results))
        except Exception as e:
            return jsonify(error_response(ResponseCode.INTERNAL_ERROR, f"批量获取分时数据失败: {str(e)}"))
    
    @app.route('/api/stock/batch/price', methods=['POST'])
    @cached(timeout=60)
    def get_batch_price():
        """批量获取价格数据"""
        try:
            data = request.get_json()
            codes = data.get('codes', [])
            
            if not codes or len(codes) == 0:
                return jsonify(error_response(ResponseCode.BAD_REQUEST, "股票代码列表不能为空"))
            
            results = []
            for code in codes:
                current_price, change_percent = stock_service.get_price_and_change_percent(code)
                results.append({
                    'code': code,
                    'current_price': current_price,
                    'change_percent': change_percent
                })
            
            return jsonify(success_response(results))
        except Exception as e:
            return jsonify(error_response(ResponseCode.INTERNAL_ERROR, f"批量获取价格失败: {str(e)}"))
