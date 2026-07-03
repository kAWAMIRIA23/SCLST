class TelemetryModel {
  final String driverId;
  final double latitude;
  final double longitude;
  final String? bookingId;
  final DateTime timestamp;

  const TelemetryModel({
    required this.driverId,
    required this.latitude,
    required this.longitude,
    this.bookingId,
    required this.timestamp,
  });

  Map<String, dynamic> toJson() => {
        'driver_id': driverId,
        'latitude': latitude,
        'longitude': longitude,
        'booking_id': bookingId,
        'timestamp': timestamp.toIso8601String(),
      };
}
