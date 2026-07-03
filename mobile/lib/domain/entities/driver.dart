// Enum values match backend tier_class / status strings (e.g. SMALL, ONLINE).
// ignore_for_file: constant_identifier_names

class Driver {
  final String id;
  final String name;
  final String phone;
  final String licensePlate;
  final VehicleTier tier;
  final DriverStatus status;
  final double grossEarningsUGX;
  final int completedTrips;
  final double totalKmDriven;

  const Driver({
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
}

enum VehicleTier { SMALL, MEDIUM, LARGE }

enum DriverStatus { ONLINE, OFFLINE }
