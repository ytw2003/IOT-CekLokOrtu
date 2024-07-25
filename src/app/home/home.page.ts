import { Component, OnDestroy, OnInit } from '@angular/core';
import { Platform } from '@ionic/angular';
import { Geolocation, PositionOptions } from '@capacitor/geolocation';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { AlertController } from '@ionic/angular';
import * as L from 'leaflet';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit, OnDestroy {
  map!: L.Map;
  marker?: L.Marker;

  latitude: number | null = null;
  longitude: number | null = null;

  apiUrlAnak: string = environment.apiAnak;
  apiUrlOrtu: string = environment.apiOrtu;
  intervalId: any;

  constructor(
    private http: HttpClient,
    private alertController: AlertController,
    private platform: Platform
  ) {}

  ngOnInit() {
    this.startPolling();
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  startPolling() {
    this.intervalId = setInterval(() => {
      this.loadLocationData();
    }, 5000);
  }

  ionViewDidEnter() {
    this.map = L.map('mapId').setView([-6.3276, 107.289], 6);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.map);

    this.loadLocationData();
  }

  loadLocationData() {
    this.http.get<any>(this.apiUrlAnak).subscribe(
      (response) => {
        // Mengambil latitude dan longitude dari data yang diterima
        const location = response.data[0];
        if (location) {
          const latitude = location.latitude;
          const longitude = location.longitude;

          // Tampilkan data lokasi di konsol
          console.log('Latitude:', latitude);
          console.log('Longitude:', longitude);

          // Notifikasi jika data sudah tersedia
          console.log('Data lokasi sudah tersedia');

          const customIcon = L.icon({
            iconUrl:
              'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
            shadowUrl:
              'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
          });

          // Hapus marker sebelumnya jika ada
          if (this.marker) {
            this.map.removeLayer(this.marker);
          }

          // Create and store the marker
          this.marker = L.marker([latitude, longitude], {
            icon: customIcon,
          });
          this.marker.bindPopup('<p>Saya Disini!</p>');
          this.marker.addTo(this.map);

          // Mengatur peta untuk melihat lokasi marker hanya jika peta belum di-zoom oleh user
          const currentZoom = this.map.getZoom();
          if (currentZoom <= 12) {
            this.map.setView([latitude, longitude], 12);
          } else {
            this.map.panTo([latitude, longitude]);
          }
        } else {
          console.error('No location data found');
        }
      },
      (error) => {
        console.error('Gagal mengambil data dari API:', error);
      }
    );
  }

  focusOnLocation() {
    if (this.marker) {
      // console.log('Focusing on location:', this.marker.getLatLng());
      this.map.setView(this.marker.getLatLng(), 20);
    } else {
      console.log('Marker tidak tersedia');
    }
  }

  async getCurrentLocation() {
    try {
      if (this.platform.is('hybrid')) {
        const permissionStatus = await Geolocation.checkPermissions();
        console.log('Permission status: ', permissionStatus.location);
        if (permissionStatus?.location != 'granted') {
          const requestStatus = await Geolocation.requestPermissions();
          if (requestStatus.location != 'granted') {
            // go to location settings
            return;
          }
        }
        let options: PositionOptions = {
          maximumAge: 3000,
          timeout: 10000,
          enableHighAccuracy: true,
        };
        const position = await Geolocation.getCurrentPosition(options);
        console.log(position);

        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        // Send location data to API
        this.sendLocationToAPI(latitude, longitude);
      } else {
        this.getCurrentLocationWeb();
      }
    } catch (e) {
      console.log(e);
      this.showAlert('Gagal', 'Gagal Mengirim Lokasi.');
      throw e;
    }
  }

  async getCurrentLocationWeb() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;

          console.log('Latitude: ', latitude);
          console.log('Longitude: ', longitude);

          // Send location data to API
          this.sendLocationToAPI(latitude, longitude);
        },
        (error) => {
          console.error('Error getting location', error);
          this.showAlert('Gagal', 'Gagal Mengirim Lokasi.');
        },
        {
          maximumAge: 3000,
          timeout: 10000,
          enableHighAccuracy: true,
        }
      );
    } else {
      this.showAlert('Error', 'Geolocation is not supported by this browser.');
    }
  }

  async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header: header,
      message: message,
      buttons: ['OK'],
    });

    await alert.present();
  }

  sendLocationToAPI(latitude: number, longitude: number) {
    const data = {
      latitude: latitude,
      longitude: longitude,
    };

    this.http.post(this.apiUrlOrtu, data).subscribe(
      (response) => {
        console.log('Data berhasil dikirim ke API:', response);
        this.showAlert('Berhasil', 'Berhasil Mengirim Lokasi.');
      },
      (error) => {
        console.error('Gagal mengirim data ke API:', error);
        this.showAlert('Gagal', 'Gagal Mengirim Lokasi.');
      }
    );
  }
}
