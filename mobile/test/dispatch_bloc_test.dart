import 'package:bloc_test/bloc_test.dart';
import 'package:slcts_driver/data/models/booking_offer_model.dart';import 'package:slcts_driver/presentation/blocs/dispatch/dispatch_bloc.dart';

const _demoOffer = BookingOfferModel(
  bookingId: 'b1',
  pickupAddress: 'A',
  dropoffAddress: 'B',
  cargoType: 'GENERAL',
  payloadWeightTonnes: 1,
  fareUGX: 1000,
  distanceKm: 5,
);

void main() {
  blocTest<DispatchBloc, DispatchState>(
    'emits DispatchExpired when countdown reaches zero',
    build: DispatchBloc.new,
    seed: () => const DispatchOfferReceived(_demoOffer, 3),
    act: (bloc) => bloc.add(const CountdownTicked(0)),
    expect: () => [const DispatchExpired()],
  );

  blocTest<DispatchBloc, DispatchState>(
    'emits DispatchOfferReceived when offer arrives',
    build: DispatchBloc.new,
    act: (bloc) => bloc.add(const OfferReceived(_demoOffer)),
    expect: () => [const DispatchOfferReceived(_demoOffer, 15)],
  );
}
