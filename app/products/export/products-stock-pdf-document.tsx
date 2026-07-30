import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

type ProductsStockPdfRow = {
  brand: string;
  imageSrc: string | null;
  sizes: Array<{ size: string; stock: number }>;
};

const styles = StyleSheet.create({
  page: {
    padding: 24,
    fontSize: 11,
    color: "#0f172a",
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
    padding: 16,
    border: "1 solid #e2e8f0",
    borderRadius: 16,
    backgroundColor: "#ffffff",
  },
  brandMark: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  businessName: {
    fontSize: 18,
    fontWeight: 800,
  },
  meta: {
    fontSize: 10,
    color: "#475569",
    textAlign: "right",
    lineHeight: 1.45,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  card: {
    width: "48%",
    border: "1 solid #e2e8f0",
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#ffffff",
    marginBottom: 14,
  },
  image: {
    width: "100%",
    height: 180,
    objectFit: "cover",
    backgroundColor: "#e2e8f0",
  },
  imagePlaceholder: {
    width: "100%",
    height: 180,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
    color: "#94a3b8",
    fontSize: 10,
    letterSpacing: 1.5,
  },
  cardBody: {
    padding: 12,
  },
  cardHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
    gap: 10,
  },
  label: {
    fontSize: 9,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 1.6,
    marginBottom: 4,
  },
  brand: {
    fontSize: 18,
    fontWeight: 800,
  },
  totalChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#ecfdf5",
    color: "#166534",
    fontSize: 10,
    fontWeight: 700,
  },
  sizesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  sizeCard: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 10,
    border: "1 solid #e2e8f0",
    borderRadius: 12,
    backgroundColor: "#f8fafc",
  },
  sizeText: {
    fontSize: 11,
    fontWeight: 700,
  },
  stockText: {
    fontSize: 14,
    fontWeight: 800,
    color: "#166534",
  },
  footer: {
    position: "absolute",
    bottom: 14,
    left: 24,
    right: 24,
    fontSize: 9,
    color: "#64748b",
    textAlign: "center",
  },
});

export function ProductsStockPdfDocument({
  rows,
  warehouseLabel,
  generatedAt,
  logoSrc,
}: {
  rows: ProductsStockPdfRow[];
  warehouseLabel: string;
  generatedAt: string;
  logoSrc: string | null;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header} fixed>
          <View style={styles.brandMark}>
            {logoSrc ? <Image src={logoSrc} style={styles.logo} /> : null}
            <Text style={styles.businessName}>ShkelShoes</Text>
          </View>
          <Text style={styles.meta}>
            Depoja: {warehouseLabel}
            {"\n"}Gjeneruar: {generatedAt}
          </Text>
        </View>

        <View style={styles.grid}>
          {rows.map((row, index) => (
            <View key={`${row.brand}-${index}`} style={styles.card} wrap={false}>
              {row.imageSrc ? (
                <Image src={row.imageSrc} style={styles.image} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Text>PA FOTO</Text>
                </View>
              )}

              <View style={styles.cardBody}>
                <View style={styles.cardHead}>
                  <View>
                    <Text style={styles.label}>Brandi</Text>
                    <Text style={styles.brand}>{row.brand}</Text>
                  </View>
                  <Text style={styles.totalChip}>
                    {row.sizes.reduce((sum, item) => sum + item.stock, 0)} gjithsej
                  </Text>
                </View>

                <View style={styles.sizesGrid}>
                  {row.sizes.map((item) => (
                    <View key={`${row.brand}-${item.size}`} style={styles.sizeCard}>
                      <Text style={styles.sizeText}>Nr {item.size}</Text>
                      <Text style={styles.stockText}>{item.stock}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          ))}
        </View>

        <Text
          style={styles.footer}
          fixed
          render={({ pageNumber, totalPages }) =>
            `ShkelShoes • Lista e stokut • ${pageNumber}/${totalPages}`
          }
        />
      </Page>
    </Document>
  );
}
