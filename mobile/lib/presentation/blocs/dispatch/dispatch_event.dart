part of 'dispatch_bloc.dart';

abstract class DispatchEvent extends Equatable {
  const DispatchEvent();

  @override
  List<Object?> get props => [];
}

class OfferReceived extends DispatchEvent {
  const OfferReceived(this.offer);

  final BookingOfferModel offer;

  @override
  List<Object?> get props => [offer];
}

class OfferAccepted extends DispatchEvent {
  const OfferAccepted();
}

class OfferDeclined extends DispatchEvent {
  const OfferDeclined();
}

class CountdownTicked extends DispatchEvent {
  const CountdownTicked(this.secondsRemaining);

  final int secondsRemaining;

  @override
  List<Object?> get props => [secondsRemaining];
}
