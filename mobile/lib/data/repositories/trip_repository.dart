import 'package:dio/dio.dart';

import '../../core/errors/exceptions.dart';
import '../../domain/entities/driver.dart';

class TripRepository {
  TripRepository({required Dio dio}) : _dio = dio;

  final Dio _dio;

  Future<DriverStatus> toggleOnlineStatus(bool isOnline) async {
    try {
      await _dio.patch<Map<String, dynamic>>(
        '/api/driver/status',
        data: {'is_online': isOnline},
      );
      return isOnline ? DriverStatus.ONLINE : DriverStatus.OFFLINE;
    } on DioException catch (e) {
      if (e.response?.statusCode == 404 || e.type == DioExceptionType.connectionError) {
        return isOnline ? DriverStatus.ONLINE : DriverStatus.OFFLINE;
      }
      throw NetworkException(e.message ?? 'Failed to update online status');
    }
  }

  Future<void> acceptBooking(String bookingId) async {
    try {
      await _dio.patch<Map<String, dynamic>>(
        '/api/driver/bookings/$bookingId/accept',
      );
    } on DioException catch (e) {
      if (e.response?.statusCode == 404 || e.type == DioExceptionType.connectionError) {
        return;
      }
      throw NetworkException(e.message ?? 'Failed to accept booking');
    }
  }

  Future<void> confirmDelivery(String bookingId) async {
    try {
      await _dio.patch<Map<String, dynamic>>(
        '/api/driver/bookings/$bookingId/complete',
      );
    } on DioException catch (e) {
      if (e.response?.statusCode == 404 || e.type == DioExceptionType.connectionError) {
        return;
      }
      throw NetworkException(e.message ?? 'Failed to confirm delivery');
    }
  }

  Future<void> simulateDispatch() async {
    await _dio.post<Map<String, dynamic>>('/api/driver/dispatch/simulate');
  }
}
