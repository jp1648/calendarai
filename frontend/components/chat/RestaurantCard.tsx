import { View, Text, StyleSheet, TouchableOpacity, Linking } from "react-native";
import { s, fontSize } from "../../lib/responsive";
import { EARTHY, ACCENT, FONTS } from "../../lib/theme";

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
    let stars = "\u2605".repeat(full);
    if (half) stars += "\u00BD";
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
    backgroundColor: EARTHY.white,
    borderRadius: s(12),
    padding: s(14),
    marginVertical: s(4),
    borderWidth: 1,
    borderColor: EARTHY.sand,
    maxWidth: "85%" as any,
    alignSelf: "flex-start",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: s(4),
  },
  name: {
    fontSize: fontSize(16),
    fontFamily: FONTS.bodyMedium,
    color: EARTHY.bark,
    flex: 1,
    marginRight: s(8),
  },
  rating: {
    fontSize: fontSize(13),
    color: "#B8855C",
    fontFamily: FONTS.bodyMedium,
  },
  meta: {
    flexDirection: "row",
    marginBottom: s(4),
  },
  metaText: {
    fontSize: fontSize(13),
    color: EARTHY.barkSoft,
    fontFamily: FONTS.body,
  },
  address: {
    fontSize: fontSize(13),
    color: EARTHY.stone,
    fontFamily: FONTS.bodyLight,
    marginBottom: s(8),
  },
  bookButton: {
    backgroundColor: ACCENT,
    borderRadius: s(8),
    paddingVertical: s(8),
    alignItems: "center",
  },
  bookText: {
    color: EARTHY.white,
    fontSize: fontSize(14),
    fontFamily: FONTS.bodyMedium,
  },
});
