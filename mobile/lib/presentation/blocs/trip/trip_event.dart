part of 'trip_bloc.dart';

abstract class TripEvent extends Equatable {
  const TripEvent();

  @override
  List<Object?> get props => [];
}

class ToggleOnlineStatusEvent extends TripEvent {
  const ToggleOnlineStatusEvent(this.isOnline);

  final bool isOnline;

  @override
  List<Object?> get props => [isOnline];
}

class DeliveryConfirmed extends TripEvent {
  const DeliveryConfirmed();
}

class ActiveTripStarted extends TripEvent {
  const ActiveTripStarted(this.offer);

  final BookingOfferModel offer;

  @override
  List<Object?> get props => [offer];
}
