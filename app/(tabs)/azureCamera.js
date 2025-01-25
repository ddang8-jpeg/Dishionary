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
      // Read the image as a binary and add to form
      const image = await fetch(uri);
      const blob = await image.blob();
      const formData = new FormData();
      formData.append("image", blob); // Attach the file as "image" to match `upload.single("image")`

      // Call Azure OCR
      const response = await fetch("http://localhost:3000/analyze-image", {
        method: "POST",
        body: formData,
      });

      let extractedText = "";

      if (response.ok) {
        const data = await response.json(); // Parse the response body as JSON
        console.log(data);
        console.log(data.textBlocks);

        data.textBlocks.forEach((block, blockIndex) => {
          extractedText += `Text Block ${blockIndex + 1}:\n`; // Add block header

          // Iterate over each line within the block
          block.forEach((line, lineIndex) => {
            // If the line has text, add it to the string
            if (line.text) {
              extractedText += `Line ${lineIndex + 1}: ${line.text}\n`; // Add line text
            }
          });
          // Adding a separator between blocks for clarity
          extractedText += "---\n";
        });
      }
      setText(extractedText); // Set recognized text
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
