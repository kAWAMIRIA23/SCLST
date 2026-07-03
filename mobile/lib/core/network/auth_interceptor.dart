import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AuthInterceptor extends Interceptor {
  AuthInterceptor(this._prefs);

  final SharedPreferences _prefs;
  static const _tokenKey = 'auth_token';

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final token = _prefs.getString(_tokenKey);
    if (token != null && token.isNotEmpty && !token.startsWith('driver-token-')) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }
}
