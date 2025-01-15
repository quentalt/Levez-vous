import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider } from 'react-native-paper';
import {theme} from "./theme";
import {HomeScreen} from "./screens/HomeScreen";
import {CreateStrikeScreen} from "./screens/CreateStrikeScreen";
import {EditStrikeScreen} from "./screens/EditStrikeScreen";

const Stack = createNativeStackNavigator();

export default function App() {
    return (
        <PaperProvider theme={theme}>
            <NavigationContainer>
                <Stack.Navigator>
                    <Stack.Screen name="Home" component={HomeScreen} />
                    <Stack.Screen name="CreateStrike" component={CreateStrikeScreen} />
                    <Stack.Screen name="EditStrike" component={EditStrikeScreen} />
                </Stack.Navigator>
            </NavigationContainer>
        </PaperProvider>
    );
}