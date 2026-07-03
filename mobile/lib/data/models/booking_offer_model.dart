import '../../domain/entities/booking_offer.dart';

class BookingOfferModel {
  final String bookingId;
  final String pickupAddress;
  final String dropoffAddress;
  final String cargoType;
  final double payloadWeightTonnes;
  final double fareUGX;
  final double distanceKm;

  const BookingOfferModel({
    required this.bookingId,
    required this.pickupAddress,
    required this.dropoffAddress,
    required this.cargoType,
    required this.payloadWeightTonnes,
    required this.fareUGX,
    required this.distanceKm,
  });

  factory BookingOfferModel.fromJson(Map<String, dynamic> json) =>
      BookingOfferModel(
        bookingId: json['booking_id'] as String,
        pickupAddress: json['pickup_address'] as String,
        dropoffAddress: json['dropoff_address'] as String,
        cargoType: json['cargo_type'] as String,
        payloadWeightTonnes:
            (json['payload_weight_tonnes'] as num).toDouble(),
        fareUGX: (json['fare_ugx'] as num).toDouble(),
        distanceKm: (json['distance_km'] as num).toDouble(),
      );

  BookingOffer toEntity() => BookingOffer(
        bookingId: bookingId,
        pickupAddress: pickupAddress,
        dropoffAddress: dropoffAddress,
        cargoType: cargoType,
        payloadWeightTonnes: payloadWeightTonnes,
        fareUGX: fareUGX,
        distanceKm: distanceKm,
      );
}
