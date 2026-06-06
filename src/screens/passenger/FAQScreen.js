import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';

export default function FAQScreen({ navigation }) {
  const handleContactWhatsApp = () => {
    const phoneNumber = '6281234567890'; // ganti dengan nomor WA admin yang sebenarnya
    const message = 'Halo Admin Bus Ticketing, saya butuh bantuan mengenai tiket saya...';
    const url = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
    
    Linking.openURL(url).catch(() => {
      alert('Pastikan WhatsApp sudah terinstal di perangkat Anda');
    });
  };

  const faqs = [
    {
      question: 'Bagaimana cara memesan tiket bus?',
      answer: 'Anda dapat mencari rute dan tanggal keberangkatan pada halaman utama, pilih bus yang tersedia, pilih kursi, dan lakukan pembayaran.'
    },
    {
      question: 'Metode pembayaran apa saja yang didukung?',
      answer: 'Kami mendukung pembayaran melalui E-Wallet (OVO, GoPay, Dana) dan Cash (Bayar di tempat).'
    },
    {
      question: 'Apakah saya bisa membatalkan tiket?',
      answer: 'Ya, Anda bisa membatalkan tiket melalui menu Tiket Saya, pilih tiket, lalu tekan tombol Batalkan Tiket. Harap cantumkan alasan pembatalan.'
    },
    {
      question: 'Bagaimana jika saya ingin mengubah jadwal?',
      answer: 'Saat ini perubahan jadwal secara langsung belum didukung. Anda dapat membatalkan tiket sebelumnya dan memesan tiket baru.'
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bantuan (FAQ)</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.faqSection}>
          <Text style={styles.sectionTitle}>Pertanyaan yang Sering Diajukan</Text>
          {faqs.map((faq, index) => (
            <View key={index} style={styles.faqCard}>
              <Text style={styles.faqQuestion}>{faq.question}</Text>
              <Text style={styles.faqAnswer}>{faq.answer}</Text>
            </View>
          ))}
        </View>

        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>Masih butuh bantuan?</Text>
          <Text style={styles.contactDesc}>
            Tim dukungan kami siap membantu Anda. Hubungi kami melalui WhatsApp untuk respon yang lebih cepat.
          </Text>
          
          <TouchableOpacity style={styles.waButton} onPress={handleContactWhatsApp}>
            <FontAwesome5 name="whatsapp" size={24} color="#fff" />
            <Text style={styles.waButtonText}>Hubungi via WhatsApp</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
  },
  faqSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  faqCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E88E5',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  contactSection: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#fff',
    marginTop: 16,
    marginBottom: 32,
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  contactDesc: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  waButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#25D366',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    elevation: 2,
  },
  waButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 12,
  },
});
