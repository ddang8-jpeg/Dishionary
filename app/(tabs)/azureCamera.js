import React, { useState } from "react";
import {
  View,
  Button,
  Image,
  Modal,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from "react-native";
import { ThemedText } from "@/components/ThemedText";
import * as ImagePicker from "expo-image-picker";

export default function CameraScreen() {
  const [imageUri, setImageUri] = useState(null);
  const [searchUri, setSearchImageUrl] = useState(null);
  const [searchedWord, setSearchedWord] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [finishedProcessing, setfinishedProcessing] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [wordsData, setWordsData] = useState([]);
  const [imageDimensions, setImageDimensions] = useState({
    width: 0,
    height: 0,
  });

  const getScaledCoordinates = (
    originalBoundingBox,
    imageDisplayWidth,
    imageDisplayHeight
  ) => {
    // Azure returns coordinates in left,top,width,height format
    const [bl, br, tr, tl] = originalBoundingBox;

    const left = bl.x < tl.x ? bl.x : tl.x;
    const top = bl.y > br.y ? bl.y : br.y;
    const width = br.x - bl.x > tr.x - tl.y ? br.x - bl.x : tr.x - tl.x;
    const height = br.y - tl.y > tr.y - bl.y ? br.y - tl.y : tr.y - bl.y;

    // Calculate scaling factors
    const scaleX = imageDisplayWidth / imageDimensions.width;
    const scaleY = imageDisplayHeight / imageDimensions.height;

    return {
      left: left,
      top: top,
      width: width,
      height: height,
    };
  };

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
      const width = result.assets[0].width;
      const height = result.assets[0].height;
      setImageDimensions({ width, height });
      console.log(imageDimensions);
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
      const response = await fetch(
        "http://localhost:3000/azure/analyze-image",
        {
          method: "POST",
          body: formData,
        }
      );

      if (response.ok) {
        const data = await response.json();
        const words = data.textBlocks.flatMap((block) =>
          block.flatMap((line) =>
            line.words.map((word) => ({
              text: word.text,
              boundingBox: word.boundingPolygon,
            }))
          )
        );
        console.log("azure response: ", words);
        setWordsData(words);
      }
    } catch (error) {
      console.error("Error processing image:", error);
      setText("Could not process the image.");
    } finally {
      setIsProcessing(false);
      setfinishedProcessing(true);
    }
  };

  const getImage = async (query) => {
    try {
      const params = new URLSearchParams({ q: query });
      const url = `http://localhost:3000/google/get-images?${params}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (response.ok) {
        const data = await response.json();
        setSearchImageUrl(data.images[0].link);
      }
    } catch (error) {
      console.error("Error getting images for word: ", error);
    }
  };

  const WordOverlay = ({ words, imageUri }) => {
    const [displayDimensions, setDisplayDimensions] = useState({
      width: 0,
      height: 0,
    });

    return (
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: imageUri }}
          style={{
            width: imageDimensions.width,
            height: imageDimensions.height,
          }}
          /*
          onLayout={(event) => {
            const { width, height } = event.nativeEvent.layout;
            // console.log("Width: ", width, " Height: ", height);
            // console.log("Image width: ", width, "Image height: ", height);
            setDisplayDimensions({ width, height });
          }}
          */
        />
        {words.map((word, index) => {
          const scaled = getScaledCoordinates(
            word.boundingBox,
            displayDimensions.width,
            displayDimensions.height
          );
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.wordBox,
                {
                  position: "absolute",
                  left: scaled.left,
                  top: scaled.top,
                  width: scaled.width,
                  height: scaled.height,
                },
              ]}
              onPress={async () => {
                await getImage(word.text);
                setSearchedWord(word.text);
                setIsModalVisible(true);
              }}
            >
              <View style={styles.highlightBox} />
            </TouchableOpacity>
          );
        })}
        {/* Image Popup Modal */}
        <Modal
          visible={isModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsModalVisible(false)}
        >
          <TouchableWithoutFeedback onPress={() => setIsModalVisible(false)}>
            <View style={styles.modalBackdrop}>
              <View style={styles.modalContent}>
                <ThemedText>{searchedWord}</ThemedText>
                <Image
                  source={{ uri: searchUri }}
                  style={styles.modalImage}
                  resizeMode="contain"
                />

                <Button
                  title="Close"
                  onPress={() => setIsModalVisible(false)}
                />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {isProcessing ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : finishedProcessing ? (
        <WordOverlay words={wordsData} imageUri={imageUri} />
      ) : (
        <View>
          <Button title="Pick an Image" onPress={pickImage} />
          {imageUri && (
            <Image
              source={{ uri: imageUri }}
              style={styles.image}
              onLoad={(event) => {
                const { width, height } = Image.resolveAssetSource({
                  uri: imageUri,
                });
              }}
            />
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
    overflow: "scroll",
    padding: 20,
  },
  image: {
    width: 300,
    height: 300,
  },
  text: {
    marginTop: 20,
    textAlign: "center",
    fontSize: 16,
    color: "#333",
  },
  imageContainer: {
    position: "relative",
  },
  wordBox: {
    position: "absolute",
    backgroundColor: "rgba(255, 255, 0, 0.2)",
    borderWidth: 1,
    borderColor: "yellow",
  },
  highlightBox: {
    flex: 1,
    backgroundColor: "transparent",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "black",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
    width: "80%",
  },
  modalImage: {
    width: 500,
    height: 500,
    marginBottom: 20,
  },
});
