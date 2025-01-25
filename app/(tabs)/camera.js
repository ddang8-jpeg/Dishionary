import React, { useState } from "react";
import {
  View,
  Button,
  Image,
  Text,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import ParallaxScrollView from "@/components/ParallaxScrollView";
import { ThemedText } from "@/components/ThemedText";
import * as ImagePicker from "expo-image-picker";
import Tesseract from "tesseract.js";

export default function CameraScreen() {
  const [imageUri, setImageUri] = useState(null);
  const [text, setText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [finishedProcessing, setfinishedProcessing] = useState(false);

  const pickImage = async () => {
    // Request permission to access the gallery
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      alert("Permission to access the gallery is required!");
      return;
    }

    // Open the image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      processImage(result.assets[0].uri);
    }
  };

  const processImage = async (uri) => {
    setIsProcessing(true);

    try {
      const { data } = await Tesseract.recognize(uri, "eng", {
        logger: (info) => console.log(info), // Log progress
      });
      setText(data.text); // Set recognized text
    } catch (error) {
      console.error("Error processing image:", error);
      setText("Could not process the image.");
    } finally {
      setIsProcessing(false);
      setfinishedProcessing(true);
    }
  };

  return (
    <View style={styles.container}>
      {isProcessing ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : finishedProcessing ? (
        <ParallaxScrollView
          headerBackgroundColor={{ light: "#A1CEDC", dark: "#1D3D47" }}
          headerImage={
            <Image source={{ uri: imageUri }} style={styles.image} />
          }
        >
          <ThemedText>{text}</ThemedText>
        </ParallaxScrollView>
      ) : (
        <View>
          <Button title="Pick an Image" onPress={pickImage} />
          {imageUri && (
            <Image source={{ uri: imageUri }} style={styles.image} />
          )}

          <ThemedText>{"Recognized text will appear here"}</ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  image: {
    width: 300,
    height: 300,
    marginVertical: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  text: {
    marginTop: 20,
    textAlign: "center",
    fontSize: 16,
    color: "#333",
  },
});
