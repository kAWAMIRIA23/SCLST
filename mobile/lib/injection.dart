import 'package:dio/dio.dart';
import 'package:get_it/get_it.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'core/constants/app_config.dart';
import 'core/network/auth_interceptor.dart';
import 'core/network/websocket_client.dart';
import 'data/models/driver_model.dart';
import 'data/repositories/auth_repository.dart';
import 'data/repositories/trip_repository.dart';
import 'domain/usecases/accept_booking.dart';
import 'domain/usecases/stream_telemetry.dart';
import 'domain/usecases/submit_onboarding.dart';
import 'domain/usecases/toggle_online_status.dart';
import 'presentation/blocs/auth/auth_bloc.dart';
import 'presentation/blocs/dispatch/dispatch_bloc.dart';
import 'presentation/blocs/trip/trip_bloc.dart';

final sl = GetIt.instance;

Future<void> configureDependencies() async {
  final prefs = await SharedPreferences.getInstance();
  final dio = Dio(BaseOptions(baseUrl: AppConfig.baseUrl));
  dio.interceptors.add(AuthInterceptor(prefs));

  sl
    ..registerSingleton<SharedPreferences>(prefs)
    ..registerSingleton<Dio>(dio)
    ..registerLazySingleton(WebSocketClient.new)
    ..registerLazySingleton(
      () => AuthRepository(dio: sl(), prefs: sl()),
    )
    ..registerLazySingleton(() => TripRepository(dio: sl()))
    ..registerLazySingleton(() => SubmitOnboarding(sl()))
    ..registerLazySingleton(() => ToggleOnlineStatus(sl()))
    ..registerLazySingleton(() => AcceptBooking(sl()))
    ..registerLazySingleton(() => StreamTelemetry(sl()))
    ..registerFactory(() => AuthBloc(submitOnboarding: sl()))
    ..registerFactory(() => DispatchBloc());
}

TripBloc createTripBloc(DriverModel driver) {
  return TripBloc(
    toggleOnlineStatus: sl(),
    tripRepository: sl(),
    driver: driver,
  );
}

Future<DriverModel?> getInitialDriver() => sl<AuthRepository>().getStoredDriver();
