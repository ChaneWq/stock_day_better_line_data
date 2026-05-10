
"""
统一响应模型
"""
from enum import Enum


class ResponseCode(Enum):
    """响应状态码枚举"""
    SUCCESS = 200
    BAD_REQUEST = 400
    UNAUTHORIZED = 401
    NOT_FOUND = 404
    INTERNAL_ERROR = 500


def success_response(data=None, message="success"):
    """
    成功响应
    
    Args:
        data: 响应数据
        message: 响应消息
    
    Returns:
        dict: 统一格式的响应
    """
    return {
        "code": ResponseCode.SUCCESS.value,
        "message": message,
        "data": data
    }


def error_response(code: ResponseCode, message: str):
    """
    错误响应
    
    Args:
        code: 错误状态码
        message: 错误消息
    
    Returns:
        dict: 统一格式的响应
    """
    return {
        "code": code.value,
        "message": message,
        "data": None
    }

