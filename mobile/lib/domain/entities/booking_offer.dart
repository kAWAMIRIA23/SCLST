class BookingOffer {  final String bookingId;
  final String pickupAddress;
  final String dropoffAddress;
  final String cargoType;
  final double payloadWeightTonnes;
  final double fareUGX;
  final double distanceKm;

  const BookingOffer({
    required this.bookingId,
    required this.pickupAddress,
    required this.dropoffAddress,
    required this.cargoType,
    required this.payloadWeightTonnes,
    required this.fareUGX,
    required this.distanceKm,
  });
}
