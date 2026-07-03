import '../../domain/entities/driver.dart';

class DriverModel {
  final String id;  final String name;
  final String phone;
  final String licensePlate;
  final VehicleTier tier;
  final DriverStatus status;
  final double grossEarningsUGX;
  final int completedTrips;
  final double totalKmDriven;

  const DriverModel({
    required this.id,
    required this.name,
    required this.phone,
    required this.licensePlate,
    required this.tier,
    this.status = DriverStatus.OFFLINE,
    this.grossEarningsUGX = 0,
    this.completedTrips = 0,
    this.totalKmDriven = 0,
  });

  double get netPayoutUGX => grossEarningsUGX * 0.85;

  factory DriverModel.fromJson(Map<String, dynamic> json) => DriverModel(
        id: json['id'] as String,
        name: json['name'] as String,
        phone: json['phone'] as String,
        licensePlate: json['license_plate'] as String,
        tier: VehicleTier.values.byName(json['tier_class'] as String),
        grossEarningsUGX: (json['gross_earnings_ugx'] as num).toDouble(),
        completedTrips: json['completed_trips'] as int,
        totalKmDriven: (json['total_km_driven'] as num).toDouble(),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'phone': phone,
        'license_plate': licensePlate,
        'tier_class': tier.name,
        'gross_earnings_ugx': grossEarningsUGX,
        'completed_trips': completedTrips,
        'total_km_driven': totalKmDriven,
      };

  Driver toEntity() => Driver(
        id: id,
        name: name,
        phone: phone,
        licensePlate: licensePlate,
        tier: tier,
        status: status,
        grossEarningsUGX: grossEarningsUGX,
        completedTrips: completedTrips,
        totalKmDriven: totalKmDriven,
      );

  DriverModel copyWith({
    DriverStatus? status,
    double? grossEarningsUGX,
    int? completedTrips,
    double? totalKmDriven,
  }) {
    return DriverModel(
      id: id,
      name: name,
      phone: phone,
      licensePlate: licensePlate,
      tier: tier,
      status: status ?? this.status,
      grossEarningsUGX: grossEarningsUGX ?? this.grossEarningsUGX,
      completedTrips: completedTrips ?? this.completedTrips,
      totalKmDriven: totalKmDriven ?? this.totalKmDriven,
    );
  }
}
