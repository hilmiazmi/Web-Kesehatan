//! Layer query: satu-satunya tempat yang menulis SQL.
//!
//! Handler HTTP tidak pernah menyusun SQL sendiri. Dengan begitu, perubahan
//! nama kolom tidak menyentuh banyak berkas sekaligus, dan semua query bisa
//! dibaca untuk ditinjau di satu folder.

pub mod appointments;
pub mod beds;
pub mod catalog;
pub mod content;
pub mod submissions;

pub use catalog::{DoctorRow, PolyclinicRow, ScheduleRow, SpecialtyRow};
pub use content::{HomeBundle, McuPackageDetail, McuPackageRow, ServiceRow, SettingBundle};
