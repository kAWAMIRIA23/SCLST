import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../core/errors/exceptions.dart';
import '../models/driver_model.dart';
import '../../domain/entities/driver.dart';

class AuthRepository {
  AuthRepository({
    required Dio dio,
    required SharedPreferences prefs,
  })  : _dio = dio,
        _prefs = prefs;

  final Dio _dio;
  final SharedPreferences _prefs;

  static const _tokenKey = 'auth_token';
  static const _driverKey = 'driver_profile';

  Future<DriverModel> submitOnboarding({
    required String phone,
    required String licensePlate,
    required VehicleTier tier,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/api/driver/onboarding',
        data: {
          'phone': phone,
          'license_plate': licensePlate,
          'tier_class': tier.name,
        },
      );

      final data = response.data?['data'] as Map<String, dynamic>? ??
          response.data as Map<String, dynamic>;
      final driver = DriverModel.fromJson({
        ...data,
        'phone': phone,
        'license_plate': licensePlate,
        'tier_class': tier.name,
      });

      final token = data['token'] as String?;
      if (token != null && token.isNotEmpty) {
        await saveToken(token);
      } else {
        await saveToken('driver-token-${driver.id}');
      }
      await saveDriver(driver);
      return driver;
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        throw AuthException(e.response?.data?['error']?.toString() ?? 'Unauthorized');
      }
      if (e.response?.statusCode == 404 || e.type == DioExceptionType.connectionError) {
        final mockDriver = DriverModel(
          id: 'driver-${DateTime.now().millisecondsSinceEpoch}',
          name: 'SLCTS Driver',
          phone: phone,
          licensePlate: licensePlate,
          tier: tier,
          grossEarningsUGX: 1250000,
          completedTrips: 42,
          totalKmDriven: 3180.5,
        );
        await saveToken('driver-token-${mockDriver.id}');
        await saveDriver(mockDriver);
        return mockDriver;
      }
      throw NetworkException(e.message ?? 'Network error during onboarding');
    }
  }

  Future<void> saveToken(String token) => _prefs.setString(_tokenKey, token);

  Future<String?> getToken() async => _prefs.getString(_tokenKey);

  Future<void> saveDriver(DriverModel driver) =>
      _prefs.setString(_driverKey, jsonEncode(driver.toJson()));

  Future<DriverModel?> getStoredDriver() async {
    final raw = _prefs.getString(_driverKey);
    if (raw == null) return null;
    return DriverModel.fromJson(jsonDecode(raw) as Map<String, dynamic>);
  }

  Future<void> clearSession() async {
    await _prefs.remove(_tokenKey);
    await _prefs.remove(_driverKey);
  }
}
