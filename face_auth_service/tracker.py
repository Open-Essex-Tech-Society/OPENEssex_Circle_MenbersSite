# Live Pose Detector with Virtual Button using MediaPipe and YOLO
import cv2
import mediapipe as mp
import time
import torch  # For YOLO object detection

class LivePoseDetectorWithButton:
    def __init__(self):
        # Initialize MediaPipe Pose and Hands
        self.mp_pose = mp.solutions.pose
        self.pose = self.mp_pose.Pose()
        self.mp_drawing = mp.solutions.drawing_utils

        self.mp_hands = mp.solutions.hands
        self.hands = self.mp_hands.Hands()

        # Initialize MediaPipe Face Mesh
        self.mp_face_mesh = mp.solutions.face_mesh
        self.face_mesh = self.mp_face_mesh.FaceMesh(static_image_mode=False, max_num_faces=1, refine_landmarks=True)

        # Initialize MediaPipe Holistic for full body detection
        self.mp_holistic = mp.solutions.holistic
        self.holistic = self.mp_holistic.Holistic(static_image_mode=False, model_complexity=2, enable_segmentation=False)

        # Virtual button properties
        self.button_x = 50
        self.button_y = 50
        self.button_width = 100
        self.button_height = 50
        self.last_photo_time = 0

        # Load YOLO model for object detection
        self.yolo_model = torch.hub.load('ultralytics/yolov5', 'yolov5s')

    def detect_pose(self, frame):
        # Convert frame to RGB for MediaPipe processing
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.pose.process(rgb_frame)

        if results.pose_landmarks:
            # Draw pose landmarks on the frame
            self.mp_drawing.draw_landmarks(
                frame, results.pose_landmarks, self.mp_pose.POSE_CONNECTIONS,
                self.mp_drawing.DrawingSpec(color=(0, 255, 0), thickness=2, circle_radius=2),
                self.mp_drawing.DrawingSpec(color=(0, 0, 255), thickness=2, circle_radius=2)
            )

        return frame

    def detect_hands_and_button(self, frame, raw_frame):
        # Convert frame to RGB for MediaPipe processing
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.hands.process(rgb_frame)

        # Draw virtual button
        cv2.rectangle(frame, (self.button_x, self.button_y),
                      (self.button_x + self.button_width, self.button_y + self.button_height),
                      (0, 255, 0), -1)
        cv2.putText(frame, "Click", (self.button_x + 10, self.button_y + 35),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)

        if results.multi_hand_landmarks:
            for hand_landmarks in results.multi_hand_landmarks:
                # Draw hand landmarks
                self.mp_drawing.draw_landmarks(frame, hand_landmarks, self.mp_hands.HAND_CONNECTIONS)

                # Get index finger tip coordinates
                index_finger_tip = hand_landmarks.landmark[self.mp_hands.HandLandmark.INDEX_FINGER_TIP]
                x = int(index_finger_tip.x * frame.shape[1])
                y = int(index_finger_tip.y * frame.shape[0])

                # Check if finger is touching the virtual button
                if (self.button_x <= x <= self.button_x + self.button_width and
                        self.button_y <= y <= self.button_y + self.button_height):
                    # Take photo if button is clicked
                    current_time = time.time()
                    if current_time - self.last_photo_time > 1:  # Prevent multiple clicks
                        self.last_photo_time = current_time
                        cv2.imwrite("photo.jpg", raw_frame)  # Save raw frame without overlays
                        print("Photo taken without tracker overlays!")

        return frame

    def detect_face_mesh(self, frame):
        # Convert frame to RGB for MediaPipe processing
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.face_mesh.process(rgb_frame)

        if results.multi_face_landmarks:
            for face_landmarks in results.multi_face_landmarks:
                # Draw face landmarks on the frame
                self.mp_drawing.draw_landmarks(
                    frame, face_landmarks, self.mp_face_mesh.FACEMESH_TESSELATION,
                    self.mp_drawing.DrawingSpec(color=(0, 255, 255), thickness=1, circle_radius=1),
                    self.mp_drawing.DrawingSpec(color=(0, 0, 255), thickness=1, circle_radius=1)
                )

        return frame

    def detect_holistic(self, frame):
        # Convert frame to RGB for MediaPipe processing
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.holistic.process(rgb_frame)

        if results.pose_landmarks:
            # Draw pose landmarks on the frame
            self.mp_drawing.draw_landmarks(
                frame, results.pose_landmarks, self.mp_holistic.POSE_CONNECTIONS,
                self.mp_drawing.DrawingSpec(color=(0, 255, 0), thickness=2, circle_radius=2),
                self.mp_drawing.DrawingSpec(color=(0, 0, 255), thickness=2, circle_radius=2)
            )

        if results.face_landmarks:
            # Draw face landmarks on the frame
            self.mp_drawing.draw_landmarks(
                frame, results.face_landmarks, self.mp_holistic.FACEMESH_TESSELATION,
                self.mp_drawing.DrawingSpec(color=(0, 255, 255), thickness=1, circle_radius=1),
                self.mp_drawing.DrawingSpec(color=(0, 0, 255), thickness=1, circle_radius=1)
            )

        if results.left_hand_landmarks:
            # Draw left hand landmarks on the frame
            self.mp_drawing.draw_landmarks(
                frame, results.left_hand_landmarks, self.mp_holistic.HAND_CONNECTIONS,
                self.mp_drawing.DrawingSpec(color=(255, 0, 0), thickness=2, circle_radius=2),
                self.mp_drawing.DrawingSpec(color=(0, 255, 255), thickness=2, circle_radius=2)
            )

        if results.right_hand_landmarks:
            # Draw right hand landmarks on the frame
            self.mp_drawing.draw_landmarks(
                frame, results.right_hand_landmarks, self.mp_holistic.HAND_CONNECTIONS,
                self.mp_drawing.DrawingSpec(color=(255, 0, 0), thickness=2, circle_radius=2),
                self.mp_drawing.DrawingSpec(color=(0, 255, 255), thickness=2, circle_radius=2)
            )

        return frame

    def detect_objects(self, frame):
        # Perform object detection using YOLO
        results = self.yolo_model(frame)
        detections = results.pandas().xyxy[0]  # Get detection results as a pandas DataFrame

        for _, row in detections.iterrows():
            label = row['name']  # Object label
            confidence = row['confidence']  # Confidence score
            x1, y1, x2, y2 = int(row['xmin']), int(row['ymin']), int(row['xmax']), int(row['ymax'])

            # Draw bounding box and label on the frame
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.putText(frame, f"{label} ({confidence:.2f})", (x1, y1 - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

        return frame

if __name__ == "__main__":
    detector = LivePoseDetectorWithButton()
    cap = cv2.VideoCapture(1)

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        raw_frame = frame.copy()  # Save a copy of the raw frame
        holistic_detected_frame = detector.detect_holistic(frame)
        object_detected_frame = detector.detect_objects(holistic_detected_frame)
        final_frame = detector.detect_hands_and_button(object_detected_frame, raw_frame)

        cv2.imshow("Live Object and Holistic Detector", final_frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()