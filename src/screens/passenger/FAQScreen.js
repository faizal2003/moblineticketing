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

// ─── Color Tokens ─────────────────────────────────────────────────────────────
const C = {
  primary: '#2563EB',
  primaryLight: '#EFF6FF',
  primaryMuted: '#BFDBFE',
  bg: '#FFFFFF',
  surface: '#F8FAFC',
  surfaceAlt: '#F1F5F9',
  border: '#E2E8F0',
  text: '#0F172A',
  textSub: '#64748B',
  textMuted: '#94A3B8',
  green: '#10B981',
  greenLight: '#ECFDF5',
  white: '#FFFFFF',
  headerBg: '#1E3A5F',
  headerText: '#FFFFFF',
  headerSub: '#93C5FD',
};

export default function FAQScreen({ navigation }) {
  const handleContactWhatsApp = () => {
    const phoneNumber = '6281234567890';
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
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={C.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bantuan (FAQ)</Text>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.faqSection}>
          <Text style={styles.sectionTitle}>Pertanyaan yang Sering Diajukan</Text>
          {faqs.map((faq, index) => (
            <View key={index} style={styles.faqCard}>
              <View style={styles.faqIconWrap}>
                <Icon name="help-outline" size={20} color={C.primary} />
              </View>
              <View style={styles.faqContent}>
                <Text style={styles.faqQuestion}>{faq.question}</Text>
                <Text style={styles.faqAnswer}>{faq.answer}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.contactSection}>
          <View style={styles.contactHeader}>
            <View style={styles.contactIconWrap}>
              <Icon name="support-agent" size={28} color={C.white} />
            </View>
            <Text style={styles.contactTitle}>Masih butuh bantuan?</Text>
          </View>
          <Text style={styles.contactDesc}>
            Tim dukungan kami siap membantu Anda. Hubungi kami melalui WhatsApp untuk respon yang lebih cepat.
          </Text>
          
          <TouchableOpacity style={styles.waButton} onPress={handleContactWhatsApp}>
            <FontAwesome5 name="whatsapp" size={22} color={C.white} />
            <Text style={styles.waButtonText}>Hubungi via WhatsApp</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.headerBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.headerBg,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.headerText,
  },
  content: {
    flex: 1,
    backgroundColor: C.surface,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  faqSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.text,
    marginBottom: 16,
  },
  faqCard: {
    flexDirection: 'row',
    backgroundColor: C.white,
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  faqIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  faqContent: {
    flex: 1,
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: '600',
    color: C.primary,
    marginBottom: 6,
  },
  faqAnswer: {
    fontSize: 14,
    color: C.textSub,
    lineHeight: 20,
  },
  contactSection: {
    backgroundColor: C.white,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.text,
  },
  contactDesc: {
    fontSize: 14,
    color: C.textSub,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  waButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#25D366',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  waButtonText: {
    color: C.white,
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 12,
  },
});