let habits = JSON.parse(localStorage.getItem('habits')) || [];
let habitCategories = new Map(JSON.parse(localStorage.getItem('habitCategories')) || []);
let habitNames = new Set(habits.map(habit => habit.name));
let editingIndex = -1;
let chartInstance = null;

// Inisialisasi kategori kebiasaan
habits.forEach(habit => {
    if (!habitCategories.has(habit.name)) {
        habitCategories.set(habit.name, habit.category || 'Kesehatan');
    }
});

// Fungsi untuk menyimpan atau menambahkan kebiasaan
function saveHabit() {
    const name = document.getElementById('habit-name').value.trim();
    const time = document.getElementById('habit-time').value;
    const desc = document.getElementById('habit-desc').value.trim();

    if (!name || !time || !desc) {
        alert("Semua kolom harus diisi!");
        return;
    }

    if (habitNames.has(name)) {
        alert("Nama kebiasaan sudah ada!");
        return;
    }

    const newHabit = { name, time, desc, done: false, category: 'Kesehatan', notificationId: null };  // Set default kategori
    habits.push(newHabit);
    habitNames.add(name);
    habitCategories.set(name, 'Kesehatan');  // Simpan kategori

    localStorage.setItem('habits', JSON.stringify(habits));
    localStorage.setItem('habitCategories', JSON.stringify([...habitCategories]));
    updateHabitList();
    document.getElementById('habit-form').reset();

    scheduleNotification(newHabit); // Jadwalkan notifikasi
}

// Fungsi untuk memperbarui daftar kebiasaan
function updateHabitList() {
    const habitList = document.getElementById('habit-list');
    habitList.innerHTML = '';
    habits.forEach((habit, index) => {
        habitList.innerHTML += `<tr>
            <td>${habit.name}</td>
            <td>${habit.time}</td>
            <td>${habit.desc}</td>
            <td>${habitCategories.get(habit.name) || 'Kesehatan'}</td>
            <td>
                <button onclick="openEditModal(${index})">Edit</button>
                <button onclick="deleteHabit(${index})">Hapus</button>
                <button onclick="toggleDone(${index})">${habit.done ? 'Belum' : 'Selesai'}</button>
            </td>
        </tr>`;
    });
    updateStatistics();
}

// Fungsi untuk membuka modal edit
function openEditModal(index) {
    const habit = habits[index];
    document.getElementById('edit-habit-name').value = habit.name;
    document.getElementById('edit-habit-time').value = habit.time;
    document.getElementById('edit-habit-desc').value = habit.desc;
    document.getElementById('edit-habit-category').value = habitCategories.get(habit.name) || 'Kesehatan';
    editingIndex = index;
    document.getElementById('edit-modal').style.display = 'block';
}

// Fungsi untuk memperbarui kebiasaan
function updateHabit() {
    const name = document.getElementById('edit-habit-name').value.trim();
    const time = document.getElementById('edit-habit-time').value;
    const desc = document.getElementById('edit-habit-desc').value.trim();
    const category = document.getElementById('edit-habit-category').value;

    if (!name || !time || !desc) {
        alert("Semua kolom harus diisi!");
        return;
    }

    if (name !== habits[editingIndex].name && habitNames.has(name)) {
        alert("Nama kebiasaan sudah ada!");
        return;
    }

    const oldName = habits[editingIndex].name;
    habits[editingIndex] = { ...habits[editingIndex], name, time, desc, category };
    habitNames.delete(oldName);
    habitNames.add(name);
    habitCategories.set(name, category);

    clearNotifications(habits[editingIndex]);

    localStorage.setItem('habits', JSON.stringify(habits));
    localStorage.setItem('habitCategories', JSON.stringify([...habitCategories]));
    updateHabitList();
    closeEditModal();

    scheduleNotification(habits[editingIndex]);
}

// Fungsi untuk menutup modal edit
function closeEditModal() {
    document.getElementById('edit-modal').style.display = 'none';
}

// Fungsi untuk menghapus kebiasaan
function deleteHabit(index) {
    const habit = habits[index];
    habitNames.delete(habit.name);
    habits.splice(index, 1);
    habitCategories.delete(habit.name);
    localStorage.setItem('habits', JSON.stringify(habits));
    localStorage.setItem('habitCategories', JSON.stringify([...habitCategories]));
    updateHabitList();

    clearNotifications(habit);
}

// Fungsi untuk menandai kebiasaan selesai atau belum selesai
function toggleDone(index) {
    habits[index].done = !habits[index].done;
    localStorage.setItem('habits', JSON.stringify(habits));
    updateHabitList();
}

// Fungsi untuk memperbarui statistik
function updateStatistics() {
    const done = habits.filter(h => h.done).length;
    const notDone = habits.length - done;
    const total = habits.length;

    if (chartInstance) {
        chartInstance.destroy();
    }

    const ctx = document.getElementById('habit-chart').getContext('2d');
    chartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Selesai', 'Belum Selesai'],
            datasets: [{
                data: [done, notDone],
                backgroundColor: ['#4caf50', '#f44336'],
            }]
        },
        options: {
            responsive: true,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function (tooltipItem) {
                            const value = tooltipItem.dataset.data[tooltipItem.dataIndex];
                            return `${tooltipItem.label}: ${value} (${Math.round((value / total) * 100)}%)`;
                        }
                    }
                }
            }
        }
    });

    document.getElementById('habit-percentage').textContent = `Progress: ${Math.round((done / total) * 100)}%`;
}

// Fungsi untuk memainkan suara notifikasi
function playNotificationSound() {
    const audio = new Audio('audio/notification.mp3'); // Pastikan file audio ada di jalur ini
    audio.currentTime = 0; // Reset waktu pemutaran ke awal
    audio.play().catch(error => {
        console.error('Error playing notification sound:', error);
    });
}

// Fungsi untuk jadwalkan notifikasi
function scheduleNotification(habit) {
    if (!habit.time) return;

    clearNotifications(habit);

    const now = new Date();
    const notificationTime = new Date();
    const [hours, minutes] = habit.time.split(':').map(Number);

    if (!isNaN(hours) && !isNaN(minutes)) {
        notificationTime.setHours(hours, minutes, 0);
        const timeDifference = notificationTime - now;

        if (timeDifference > 0) {
            habit.notificationId = setTimeout(() => {
                playNotificationSound(); // Mainkan suara bersamaan dengan notifikasi
                alert(`Waktunya melakukan kebiasaan: ${habit.name}`); // Tampilkan notifikasi
            }, timeDifference);
        } else {
            console.error("Waktu notifikasi sudah lewat.");
        }
    } else {
        console.error("Format waktu tidak valid.");
    }
}

// Fungsi untuk membatalkan notifikasi (jika ada)
function clearNotifications(habit) {
    if (habit.notificationId) {
        clearTimeout(habit.notificationId);
        habit.notificationId = null;
    }
}

// Inisialisasi halaman
updateHabitList();
