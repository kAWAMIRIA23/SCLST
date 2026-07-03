import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import 'core/constants/app_theme.dart';
import 'data/models/driver_model.dart';
import 'injection.dart';
import 'presentation/blocs/auth/auth_bloc.dart';
import 'presentation/blocs/dispatch/dispatch_bloc.dart';
import 'presentation/screens/home/driver_home_screen.dart';
import 'presentation/screens/onboarding/onboarding_screen.dart';
import 'presentation/screens/permission/permission_denied_screen.dart';
import 'presentation/screens/trip/active_trip_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await configureDependencies();

  final storedDriver = await getInitialDriver();
  runApp(SlctsDriverApp(initialDriver: storedDriver));
}

class SlctsDriverApp extends StatelessWidget {
  const SlctsDriverApp({super.key, this.initialDriver});

  final DriverModel? initialDriver;

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider(create: (_) => sl<AuthBloc>()),
        BlocProvider(create: (_) => sl<DispatchBloc>()),
      ],
      child: MaterialApp(
        title: 'SLCTS Driver',
        theme: AppTheme.darkTheme,
        debugShowCheckedModeBanner: false,
        initialRoute: initialDriver != null ? '/home' : '/',
        onGenerateRoute: (settings) {
          switch (settings.name) {
            case '/':
              return MaterialPageRoute(builder: (_) => const OnboardingScreen());
            case '/home':
              final driver = (settings.arguments as DriverModel?) ?? initialDriver;
              if (driver == null) {
                return MaterialPageRoute(builder: (_) => const OnboardingScreen());
              }
              return MaterialPageRoute(
                builder: (_) => BlocProvider(
                  create: (_) => createTripBloc(driver),
                  child: DriverHomeScreen(driver: driver),
                ),
              );
            case '/active-trip':
              return MaterialPageRoute(builder: (_) => const ActiveTripScreen());
            case '/permission-denied':
              return MaterialPageRoute(
                builder: (_) => const PermissionDeniedScreen(),
              );
            default:
              return MaterialPageRoute(builder: (_) => const OnboardingScreen());
          }
        },
      ),
    );
  }
}
