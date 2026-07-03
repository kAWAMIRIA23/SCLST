part of 'trip_bloc.dart';

abstract class TripState extends Equatable {
  const TripState();

  DriverModel get driver;
}

class TripInitial extends TripState {
  const TripInitial(this.driver);

  @override
  final DriverModel driver;

  @override
  List<Object?> get props => [driver];
}

class TripOffline extends TripState {
  const TripOffline(this.driver);

  @override
  final DriverModel driver;

  @override
  List<Object?> get props => [driver];
}

class TripOnline extends TripState {
  const TripOnline(this.driver);

  @override
  final DriverModel driver;

  @override
  List<Object?> get props => [driver];
}

class TripActive extends TripState {
  const TripActive(this.driver, this.offer);

  @override
  final DriverModel driver;
  final BookingOfferModel offer;

  @override
  List<Object?> get props => [driver, offer];
}

class TripLoading extends TripState {
  const TripLoading(this.driver);

  @override
  final DriverModel driver;

  @override
  List<Object?> get props => [driver];
}

class TripError extends TripState {
  const TripError(this.driver, this.message);

  @override
  final DriverModel driver;
  final String message;

  @override
  List<Object?> get props => [driver, message];
}
