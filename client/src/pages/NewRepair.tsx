import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { repairApi } from '../api';
import { useNotification } from '../components/Layout';
import { 
  Upload, 
  X, 
  AlertTriangle, 
  User, 
  MapPin, 
  Laptop, 
  AlertCircle,
  FileText,
  Clock
} from 'lucide-react';

const NewRepair: React.FC = () => {
  const navigate = useNavigate();
  const { notify } = useNotification();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    reporter: '',
    location: '',
    device_name: '',
    problem: '',
    priority: 'ปกติ',
    received_at: new Date().toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16)
  });
  const [images, setImages] = useState<File[]>([]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newImages = Array.from(e.target.files);
      if (images.length + newImages.length > 4) {
        notify('จำกัดการอัปโหลดสูงสุด 4 รูปเท่านั้น', 'error');
        return;
      }
      setImages([...images, ...newImages]);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const oversized = images.some(img => img.size > 5 * 1024 * 1024);
    if (oversized) {
      notify('บางรูปภาพมีขนาดใหญ่เกินไป (จำกัดรูปละ 5MB)', 'error');
      return;
    }

    setLoading(true);

    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'received_at') {
          data.append(key, new Date(value).toISOString());
        } else {
          data.append(key, value);
        }
      });
      images.forEach(image => {
        data.append('images', image);
      });

      await repairApi.create(data);
      notify('🎉 ส่งข้อมูลแจ้งซ่อมเรียบร้อยแล้ว');
      navigate('/repairs');
    } catch (error) {
      console.error('Error creating repair:', error);
      notify('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="new-repair-page">
      <div className="page-header">
        <div className="page-title">
          <h2>แจ้งซ่อมอุปกรณ์ / แจ้งปัญหา</h2>
          <p>กรุณากรอกข้อมูลให้ครบถ้วนเพื่อให้ช่างดำเนินการได้รวดเร็วขึ้น</p>
        </div>
      </div>
      
      <div className="card" style={{ maxWidth: '900px', margin: '0 auto' }}>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label><User size={16} color="var(--primary)" /> ชื่อผู้แจ้ง / หน่วยงาน</label>
              <input 
                type="text" 
                required 
                placeholder="ระบุชื่อของคุณ หรือชื่อแผนก"
                value={formData.reporter}
                onChange={(e) => setFormData({...formData, reporter: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label><Clock size={16} color="var(--primary)" /> เวลาที่รับเรื่อง</label>
              <input 
                type="datetime-local" 
                required 
                value={formData.received_at}
                onChange={(e) => setFormData({...formData, received_at: e.target.value})}
              />
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                เวลาไทย: {new Date(formData.received_at).toLocaleString('th-TH', { 
                  year: 'numeric', month: 'long', day: 'numeric', 
                  hour: '2-digit', minute: '2-digit' 
                })}
              </div>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label><AlertTriangle size={16} color="var(--warning)" /> ระดับความสำคัญ</label>
              <select 
                value={formData.priority}
                onChange={(e) => setFormData({...formData, priority: e.target.value})}
              >
                <option value="ปกติ">ปกติ (Normal)</option>
                <option value="ด่วน">ด่วน (High)</option>
                <option value="ด่วนมาก">ด่วนมาก (Critical)</option>
                <option value="วิกฤต">วิกฤต (Urgent)</option>
              </select>
            </div>
            <div className="form-group">
              <label><MapPin size={16} color="var(--danger)" /> สถานที่ / จุดติดตั้ง</label>
              <input 
                type="text" 
                required 
                placeholder="เช่น ห้องประชุมชั้น 2, แผนกบัญชี"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
              />
            </div>
          </div>

          <div className="form-group">
            <label><Laptop size={16} color="var(--primary)" /> ชื่ออุปกรณ์ / รุ่น</label>
            <input 
              type="text" 
              required 
              placeholder="เช่น เครื่องพิมพ์ HP LaserJet, จอ Monitor"
              value={formData.device_name}
              onChange={(e) => setFormData({...formData, device_name: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label><AlertCircle size={16} color="var(--primary)" /> อาการเสีย / รายละเอียดปัญหา</label>
            <textarea 
              required 
              rows={4}
              placeholder="อธิบายอาการเสียที่พบอย่างละเอียด..."
              value={formData.problem}
              onChange={(e) => setFormData({...formData, problem: e.target.value})}
            ></textarea>
          </div>

          <div className="form-group">
            <label><FileText size={16} color="var(--primary)" /> รูปภาพประกอบอาการเสีย (สูงสุด 4 รูป)</label>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.85rem' }}>
              {images.map((image, index) => (
                <div key={index} className="image-preview-card">
                  <img src={URL.createObjectURL(image)} alt="preview" />
                  <button type="button" className="remove-btn" onClick={() => removeImage(index)}>
                    <X size={16} />
                  </button>
                </div>
              ))}
              {images.length < 4 && (
                <label className="image-uploader-box">
                  <Upload size={24} />
                  <span style={{ fontSize: '0.85rem', marginTop: '0.5rem', fontWeight: 600 }}>เพิ่มรูปภาพ</span>
                  <input type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} />
                </label>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '2.5rem' }}>
            <button type="button" className="btn btn-outline" onClick={() => navigate(-1)} style={{ padding: '12px 35px' }}>
              ยกเลิก
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '12px 50px', fontSize: '1rem' }}>
              {loading ? 'กำลังบันทึกข้อมูล...' : 'ส่งข้อมูลแจ้งซ่อม'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewRepair;
