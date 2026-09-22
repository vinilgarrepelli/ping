package com.ping.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardOptions
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.tooling.preview.Preview
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            PingScreen()
        }
    }
}

@Composable
fun PingScreen(modifier: Modifier = Modifier) {
    var displayName by remember { mutableStateOf("") }
    var joined by remember { mutableStateOf(false) }

    MaterialTheme(colorScheme = PingColors) {
        Surface(modifier = modifier.fillMaxSize()) {
            if (joined) {
                RoomScreen(displayName = displayName)
            } else {
                LoginScreen(
                    name = displayName,
                    onNameChange = { displayName = it },
                    onJoin = { if (displayName.isNotBlank()) joined = true }
                )
            }
        }
    }
}

private val PingColors = androidx.compose.material3.lightColorScheme(
    primary = Color(0xFF315CFF),
    onPrimary = Color.White,
    secondary = Color(0xFF22B8A7),
    background = Color(0xFFF7F8FC),
    surface = Color.White
)

// Edit this one line before creating a release APK. Leave empty to hide it.
private const val PING_LOGIN_NOTICE = ""

@Composable
private fun LoginScreen(name: String, onNameChange: (String) -> Unit, onJoin: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(horizontal = 28.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        if (PING_LOGIN_NOTICE.isNotBlank()) {
            Text(
                PING_LOGIN_NOTICE,
                color = MaterialTheme.colorScheme.primary,
                style = MaterialTheme.typography.bodyMedium,
                modifier = Modifier.padding(bottom = 18.dp)
            )
        }
        Text("PING", color = MaterialTheme.colorScheme.primary, fontSize = 48.sp, fontWeight = FontWeight.Black)
        Spacer(Modifier.height(8.dp))
        Text("A quieter way to say hello.", style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.height(48.dp))
        OutlinedTextField(
            value = name,
            onValueChange = onNameChange,
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Your name") },
            placeholder = { Text("How should people see you?") },
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Text),
            shape = RoundedCornerShape(16.dp)
        )
        Spacer(Modifier.height(16.dp))
        Button(
            onClick = onJoin,
            enabled = name.isNotBlank(),
            modifier = Modifier.fillMaxWidth().height(54.dp),
            shape = RoundedCornerShape(16.dp)
        ) {
            Text("Enter PING", fontWeight = FontWeight.Bold)
        }
        Spacer(Modifier.height(20.dp))
        Text("Prototype preview • no account required", style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

private data class ChatMessage(val author: String, val body: String, val time: String, val mine: Boolean = false)

@Composable
private fun RoomScreen(displayName: String) {
    var draft by remember { mutableStateOf("") }
    var isHoldingVoice by remember { mutableStateOf(false) }
    var showEmojiPicker by remember { mutableStateOf(false) }
    val messages = remember {
        mutableStateListOf(
            ChatMessage("Maya", "Welcome to the PING room 👋", "9:41 AM"),
            ChatMessage("Jon", "This is a space for small thoughts.", "9:42 AM"),
            ChatMessage(displayName.ifBlank { "You" }, "Nice to meet you all!", "9:43 AM", mine = true)
        )
    }

    Column(
        modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background).imePadding()
    ) {
        RoomHeader()
        LazyColumn(
            modifier = Modifier.weight(1f).fillMaxWidth(),
            contentPadding = PaddingValues(horizontal = 18.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            item {
                Text("TODAY", style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Bold)
            }
            items(messages) { message -> MessageBubble(message) }
        }
        Composer(
            draft = draft,
            onDraftChange = { draft = it },
            isHoldingVoice = isHoldingVoice,
            onVoiceStateChange = { isHoldingVoice = it },
            showEmojiPicker = showEmojiPicker,
            onEmojiToggle = { showEmojiPicker = !showEmojiPicker },
            onEmojiSelected = { emoji ->
                draft += emoji
                showEmojiPicker = false
            },
            onSend = {
                val text = draft.trim()
                if (text.isNotEmpty()) {
                    messages += ChatMessage(
                        displayName.ifBlank { "You" },
                        text,
                        currentTime(),
                        mine = true
                    )
                    draft = ""
                    showEmojiPicker = false
                }
            }
        )
    }
}

private fun currentTime(): String =
    SimpleDateFormat("h:mm a", Locale.getDefault()).format(Date())

@Composable
private fun RoomHeader() {
    Row(
        modifier = Modifier.fillMaxWidth().background(Color.White).padding(horizontal = 18.dp, vertical = 16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier.size(46.dp).background(MaterialTheme.colorScheme.primary, CircleShape),
            contentAlignment = Alignment.Center
        ) { Text("P", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 22.sp) }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text("PING room", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Text("3 people here", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Text("•••", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 20.sp)
    }
}

@Composable
private fun MessageBubble(message: ChatMessage) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = if (message.mine) Arrangement.End else Arrangement.Start
    ) {
        Card(
            colors = CardDefaults.cardColors(
                containerColor = if (message.mine) MaterialTheme.colorScheme.primary else Color.White
            ),
            shape = RoundedCornerShape(18.dp),
            elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
        ) {
            Column(Modifier.padding(horizontal = 15.dp, vertical = 11.dp)) {
                if (!message.mine) Text(message.author, color = MaterialTheme.colorScheme.secondary,
                    style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
                Text(message.body, color = if (message.mine) Color.White else MaterialTheme.colorScheme.onSurface)
                Text(message.time, color = if (message.mine) Color.White.copy(alpha = .7f) else MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.labelSmall, modifier = Modifier.align(Alignment.End))
            }
        }
    }
}

@Composable
private fun Composer(
    draft: String,
    onDraftChange: (String) -> Unit,
    isHoldingVoice: Boolean,
    onVoiceStateChange: (Boolean) -> Unit,
    showEmojiPicker: Boolean,
    onEmojiToggle: () -> Unit,
    onEmojiSelected: (String) -> Unit,
    onSend: () -> Unit
) {
    Column(Modifier.fillMaxWidth().background(Color.White).padding(horizontal = 12.dp, vertical = 10.dp)) {
        if (isHoldingVoice) {
            Text("Release to stop • voice recording will be wired next", color = MaterialTheme.colorScheme.primary,
                style = MaterialTheme.typography.labelMedium, modifier = Modifier.padding(start = 8.dp, bottom = 8.dp))
        }
        if (showEmojiPicker) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(start = 8.dp, bottom = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                listOf("😀", "😂", "😍", "🔥", "🎉", "👍", "✨").forEach { emoji ->
                    IconButton(onClick = { onEmojiSelected(emoji) }, modifier = Modifier.size(38.dp)) {
                        Text(emoji, fontSize = 20.sp)
                    }
                }
            }
        }
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = { }) { Text("＋", fontSize = 28.sp, color = MaterialTheme.colorScheme.primary) }
            OutlinedTextField(
                value = draft,
                onValueChange = onDraftChange,
                modifier = Modifier.weight(1f),
                placeholder = { Text("Write a PING…") },
                singleLine = true,
                shape = RoundedCornerShape(22.dp)
            )
            IconButton(onClick = onEmojiToggle) {
                Text("☺", fontSize = 24.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            IconButton(
                onClick = { },
                modifier = Modifier.pointerInput(Unit) {
                    detectTapGestures(
                        onPress = {
                            onVoiceStateChange(true)
                            tryAwaitRelease()
                            onVoiceStateChange(false)
                        }
                    )
                }
            ) {
                Text(if (isHoldingVoice) "●" else "◉", fontSize = 24.sp,
                    color = if (isHoldingVoice) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Button(
                onClick = onSend,
                enabled = draft.isNotBlank(),
                contentPadding = PaddingValues(horizontal = 14.dp),
                modifier = Modifier.height(44.dp),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.secondary)
            ) { Text("➤", fontSize = 18.sp) }
        }
        Text("＋ media   •   hold ◉ to record voice", style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(start = 8.dp, top = 6.dp))
    }
}

@Preview(showBackground = true)
@Composable
private fun PingScreenPreview() {
    PingScreen()
}
