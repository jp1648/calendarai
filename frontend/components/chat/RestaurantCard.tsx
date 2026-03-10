import { View, Text, StyleSheet, TouchableOpacity, Linking } from "react-native";

interface Restaurant {
  name: string;
  rating?: number;
  cuisine?: string;
  price_range?: string;
  address?: string;
  booking_url?: string;
}

export default function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  const openBooking = () => {
    if (restaurant.booking_url) {
      Linking.openURL(restaurant.booking_url);
    }
  };

  const renderStars = (rating: number) => {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5;
    let stars = "★".repeat(full);
    if (half) stars += "½";
    return stars;
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1}>
          {restaurant.name}
        </Text>
        {restaurant.rating && (
          <Text style={styles.rating}>
            {renderStars(restaurant.rating)} {restaurant.rating.toFixed(1)}
          </Text>
        )}
      </View>

      <View style={styles.meta}>
        {restaurant.cuisine && (
          <Text style={styles.metaText}>{restaurant.cuisine}</Text>
        )}
        {restaurant.price_range && (
          <Text style={styles.metaText}> · {restaurant.price_range}</Text>
        )}
      </View>

      {restaurant.address && (
        <Text style={styles.address} numberOfLines={1}>
          {restaurant.address}
        </Text>
      )}

      {restaurant.booking_url && (
        <TouchableOpacity style={styles.bookButton} onPress={openBooking}>
          <Text style={styles.bookText}>Book</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    maxWidth: "85%" as any,
    alignSelf: "flex-start",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    flex: 1,
    marginRight: 8,
  },
  rating: {
    fontSize: 13,
    color: "#FF9500",
    fontWeight: "600",
  },
  meta: {
    flexDirection: "row",
    marginBottom: 4,
  },
  metaText: {
    fontSize: 13,
    color: "#666",
  },
  address: {
    fontSize: 13,
    color: "#999",
    marginBottom: 8,
  },
  bookButton: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
  },
  bookText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
