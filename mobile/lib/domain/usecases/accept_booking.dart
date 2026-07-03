import '../../data/repositories/trip_repository.dart';

class AcceptBooking {
  AcceptBooking(this._repository);

  final TripRepository _repository;

  Future<void> call(String bookingId) => _repository.acceptBooking(bookingId);
}
