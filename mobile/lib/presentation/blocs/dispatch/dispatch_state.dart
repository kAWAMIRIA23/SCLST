part of 'dispatch_bloc.dart';

abstract class DispatchState extends Equatable {
  const DispatchState();

  @override
  List<Object?> get props => [];
}

class DispatchIdle extends DispatchState {
  const DispatchIdle();
}

class DispatchOfferReceived extends DispatchState {
  const DispatchOfferReceived(this.offer, this.secondsRemaining);

  final BookingOfferModel offer;
  final int secondsRemaining;

  @override
  List<Object?> get props => [offer, secondsRemaining];
}

class DispatchAccepted extends DispatchState {
  const DispatchAccepted(this.offer);

  final BookingOfferModel offer;

  @override
  List<Object?> get props => [offer];
}

class DispatchDeclined extends DispatchState {
  const DispatchDeclined();
}

class DispatchExpired extends DispatchState {
  const DispatchExpired();
}
